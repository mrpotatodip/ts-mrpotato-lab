import { and, asc, eq, inArray, isNotNull, isNull } from "drizzle-orm";
import { Effect } from "effect";
import { scanRunnerJobs, tenantRunners, type TScanRunnerJob } from "@repo/db-elise";
import type { DbConnectType } from "#/lib/db-connection";
import { toDbError, type DbError } from "#/lib/effect-query";
import type { JobReport, NewRunnerJob } from "#/modules/runners/types";

// -----
// The Workflow queues the job. A retried launch writes it again,
// so the same Scan never has two.
// -----
export const insertRunnerJobEffect = (db: DbConnectType, job: NewRunnerJob): Effect.Effect<void, DbError> =>
  Effect.tryPromise({ try: () => db.insert(scanRunnerJobs).values(job).onConflictDoNothing(), catch: toDbError }).pipe(Effect.asVoid);

// -----
// The Runner takes its oldest queued job in one UPDATE. The state
// is checked again in the UPDATE itself, so a job is never claimed
// twice. Null when nothing is waiting.
// -----
export const claimRunnerJobEffect = (db: DbConnectType, runnerId: string, now: Date): Effect.Effect<TScanRunnerJob | null, DbError> =>
  Effect.tryPromise({
    try: () => {
      const next = db
        .select({ scanId: scanRunnerJobs.scanId })
        .from(scanRunnerJobs)
        .where(and(eq(scanRunnerJobs.runnerId, runnerId), eq(scanRunnerJobs.state, "queued")))
        .orderBy(asc(scanRunnerJobs.createdAt))
        .limit(1);
      return db
        .update(scanRunnerJobs)
        .set({ state: "claimed", claimedAt: now })
        .where(and(inArray(scanRunnerJobs.scanId, next), eq(scanRunnerJobs.state, "queued")))
        .returning();
    },
    catch: toDbError,
  }).pipe(Effect.map(([row]) => row ?? null));

// -----
// The Runner's report. It counts only while the job is claimed by
// this Runner: a Scan that already ended (cancelled) refuses it.
// -----
export const reportRunnerJobEffect = (db: DbConnectType, report: JobReport): Effect.Effect<boolean, DbError> =>
  Effect.tryPromise({
    try: () =>
      db
        .update(scanRunnerJobs)
        .set({
          state: report.state,
          error: report.error,
          commitSha: report.commitSha,
          branch: report.branch,
          usageJson: report.usageJson,
          filesJson: report.filesJson,
          finishedAt: report.now,
        })
        .where(and(eq(scanRunnerJobs.scanId, report.scanId), eq(scanRunnerJobs.runnerId, report.runnerId), eq(scanRunnerJobs.state, "claimed")))
        .returning({ scanId: scanRunnerJobs.scanId }),
    catch: toDbError,
  }).pipe(Effect.map((rows) => rows.length > 0));

export const readRunnerJobEffect = (db: DbConnectType, scanId: string): Effect.Effect<TScanRunnerJob | null, DbError> =>
  Effect.tryPromise({ try: () => db.select().from(scanRunnerJobs).where(eq(scanRunnerJobs.scanId, scanId)), catch: toDbError }).pipe(Effect.map(([row]) => row ?? null));

// -----
// The Scan ended before the Runner reported (it timed out, or
// failed some other way): a late report is refused.
// -----
export const cancelRunnerJobEffect = (db: DbConnectType, scanId: string, now: Date): Effect.Effect<void, DbError> =>
  Effect.tryPromise({
    try: () =>
      db
        .update(scanRunnerJobs)
        .set({ state: "cancelled", finishedAt: now })
        .where(and(eq(scanRunnerJobs.scanId, scanId), inArray(scanRunnerJobs.state, ["queued", "claimed"]))),
    catch: toDbError,
  }).pipe(Effect.asVoid);

// -----
// A Runner of the Account that has paired and is not removed.
// -----
export const findConnectedRunnerEffect = (db: DbConnectType, tenantId: string, runnerId: string): Effect.Effect<boolean, DbError> =>
  Effect.tryPromise({
    try: () =>
      db
        .select({ id: tenantRunners.id })
        .from(tenantRunners)
        .where(and(eq(tenantRunners.id, runnerId), eq(tenantRunners.tenantId, tenantId), isNotNull(tenantRunners.tokenHash), isNull(tenantRunners.revokedAt))),
    catch: toDbError,
  }).pipe(Effect.map((rows) => rows.length > 0));
