import { and, asc, eq, gt, gte, inArray, lt, ne, or, sql } from "drizzle-orm";
import { Effect } from "effect";
import { scanFiles, scanFindings, scanRepos, scanRunnerJobs, scans, tenantCreditLedger, tenantRunners } from "@repo/db-elise/schema";
import type { DbConnectType } from "#/lib/db-connection";
import { Conflict, toDbError, type DbError } from "#/lib/effect-query";
import { PG_UNIQUE_VIOLATION, pgErrorCode } from "#/lib/pg-error";
import type { ScanStatus } from "#/schemas";
import type { ScanPage, ScanRepo } from "#/modules/scan-ledger/types";
import { canonicalRepo, displayRepoUrl, scanRowToStatus, summaryOf } from "#/modules/scan-ledger/utils";

type ScanRow = typeof scans.$inferSelect;

const ACTIVE_SCAN_CONFLICT = "This repo already has an active scan";

// -----
// The rows with their files, the Runner a scan ran on and, for a
// scan whose findings are recorded, the counts of what it found.
// -----
const withFiles = (db: DbConnectType, rows: ScanRow[]): Effect.Effect<ScanStatus[], DbError> =>
  rows.length === 0
    ? Effect.succeed([])
    : Effect.gen(function* () {
        const ids = rows.map((row) => row.id);
        const files = yield* Effect.tryPromise({
          try: () =>
            db
              .select({ scanId: scanFiles.scanId, name: scanFiles.name, sizeBytes: scanFiles.sizeBytes, contentType: scanFiles.contentType })
              .from(scanFiles)
              .where(inArray(scanFiles.scanId, ids))
              .orderBy(asc(scanFiles.name)),
          catch: toDbError,
        });
        const counts = yield* Effect.tryPromise({
          try: () =>
            db
              .select({ scanId: scanFindings.scanId, status: scanFindings.status, severity: scanFindings.severity, origin: scanFindings.origin, total: sql<number>`count(*)::int` })
              .from(scanFindings)
              .where(inArray(scanFindings.scanId, ids))
              .groupBy(scanFindings.scanId, scanFindings.status, scanFindings.severity, scanFindings.origin),
          catch: toDbError,
        });
        const runners = yield* Effect.tryPromise({
          try: () =>
            db
              .select({ scanId: scanRunnerJobs.scanId, id: tenantRunners.id, name: tenantRunners.name })
              .from(scanRunnerJobs)
              .innerJoin(tenantRunners, eq(tenantRunners.id, scanRunnerJobs.runnerId))
              .where(inArray(scanRunnerJobs.scanId, ids)),
          catch: toDbError,
        });
        return rows.map((row) =>
          scanRowToStatus(
            row,
            files.filter((file) => file.scanId === row.id).map(({ name, sizeBytes, contentType }) => ({ name, sizeBytes, contentType })),
            summaryOf(row, counts.filter((count) => count.scanId === row.id)),
            runners.find((runner) => runner.scanId === row.id) ?? null,
          ),
        );
      });

// -----
// A scan id starts with an inverted timestamp, so
// ascending ids are newest first and an id is a cursor.
// -----
export const neonScanRepo = (db: DbConnectType): ScanRepo => ({
  // -----
  // Insert or find the repo's record. The unique index
  // on (account, canonical) settles a race between two
  // first scans of the same repo.
  // -----
  ensureRepo: (accountId, url) =>
    Effect.tryPromise({
      try: async () => {
        const canonical = canonicalRepo(url);
        await db.insert(scanRepos).values({ tenantId: accountId, canonical, url: displayRepoUrl(url) }).onConflictDoNothing();
        const [row] = await db
          .select({ id: scanRepos.id, canonical: scanRepos.canonical, url: scanRepos.url })
          .from(scanRepos)
          .where(and(eq(scanRepos.tenantId, accountId), eq(scanRepos.canonical, canonical)));
        return row;
      },
      catch: toDbError,
    }),

  // -----
  // One batch is one transaction: first close what a scan of
  // this repo that stalled still holds (its credit hold, given
  // back with no charge, and its Runner job, cancelled so a late
  // report is refused), then expire it, then insert. The unique
  // index on active scans refuses a second live scan, and the
  // answer names the one that is running.
  // -----
  create: (params, repoId, staleBeforeMs) => {
    const stalled = db
      .select({ id: scans.id })
      .from(scans)
      .where(and(eq(scans.repoId, repoId), inArray(scans.status, ["queued", "running"]), lt(scans.updatedAt, new Date(staleBeforeMs))));
    return Effect.tryPromise({
      try: () =>
        db.batch([
          db
            .insert(tenantCreditLedger)
            .select(
              db
                .select({
                  id: sql<string>`gen_random_uuid()`.as("id"),
                  tenantId: tenantCreditLedger.tenantId,
                  kind: sql<string>`'scan_settle'`.as("kind"),
                  amountUsd: sql<string>`-${tenantCreditLedger.amountUsd}`.as("amount_usd"),
                  scanId: tenantCreditLedger.scanId,
                  idempotencyKey: sql<string | null>`null`.as("idempotency_key"),
                  note: sql<string>`'the scan stalled and was closed by a newer request'`.as("note"),
                  createdAt: sql<Date>`now()`.as("created_at"),
                })
                .from(tenantCreditLedger)
                .where(and(eq(tenantCreditLedger.kind, "scan_hold"), inArray(tenantCreditLedger.scanId, stalled))),
            )
            .onConflictDoNothing(),
          db
            .update(scanRunnerJobs)
            .set({ state: "cancelled", finishedAt: new Date() })
            .where(and(inArray(scanRunnerJobs.scanId, stalled), inArray(scanRunnerJobs.state, ["queued", "claimed"]))),
          db
            .update(scans)
            .set({ status: "failed", step: null, finishedAt: new Date(), error: "the scan stalled and was closed by a newer request", updatedAt: new Date() })
            .where(and(eq(scans.repoId, repoId), inArray(scans.status, ["queued", "running"]), lt(scans.updatedAt, new Date(staleBeforeMs)))),
          db.insert(scans).values({
          id: params.scanId,
          tenantId: params.accountId,
          repo: params.repo,
          repoId,
          ref: params.ref ?? null,
          status: "queued",
          skill: params.options.skill,
          model: params.options.model,
          effort: params.options.effort,
          profile: params.options.profile,
          budget: params.options.budget ?? null,
          maxBudgetUsd: params.options.maxBudgetUsd.toFixed(2),
          keySource: params.keySource ?? "platform",
          installationId: params.github?.installationRowId ?? null,
          githubRepoId: params.github?.repoId ?? null,
          isPrivate: params.github?.isPrivate ?? null,
          createdAt: new Date(params.createdAt),
        }),
          ...(params.github ? [db.update(scanRepos).set({ isPrivate: params.github.isPrivate }).where(eq(scanRepos.id, repoId))] : []),
        ]),
      catch: (cause) => (pgErrorCode(cause) === PG_UNIQUE_VIOLATION ? new Conflict({ message: ACTIVE_SCAN_CONFLICT }) : toDbError(cause)),
    }).pipe(
      Effect.catchTag("Conflict", () =>
        Effect.tryPromise({
          try: () => db.select({ id: scans.id }).from(scans).where(and(eq(scans.repoId, repoId), inArray(scans.status, ["queued", "running"]))).limit(1),
          catch: toDbError,
        }).pipe(Effect.flatMap(([active]) => Effect.fail(new Conflict({ message: active ? `${ACTIVE_SCAN_CONFLICT}: ${active.id}` : ACTIVE_SCAN_CONFLICT })))),
      ),
      Effect.asVoid,
    );
  },

  mark: (accountId, scanId, patch) => {
    const ended = patch.status === "succeeded" || patch.status === "failed";
    return Effect.tryPromise({
      try: () =>
        db
          .update(scans)
          .set({
            ...(patch.status !== undefined && { status: patch.status }),
            ...(patch.step !== undefined && { step: patch.step }),
            ...(patch.error !== undefined && { error: patch.error }),
            ...(patch.commitSha !== undefined && { commitSha: patch.commitSha }),
            ...(patch.branch !== undefined && { branch: patch.branch }),
            ...(ended && { finishedAt: new Date(), step: null }),
            ...(patch.usage && {
              inputTokens: patch.usage.inputTokens,
              outputTokens: patch.usage.outputTokens,
              cacheReadTokens: patch.usage.cacheReadTokens,
              cacheWriteTokens: patch.usage.cacheWriteTokens,
              costUsd: patch.usage.costUsd.toFixed(4),
              turns: patch.usage.turns,
              durationMs: patch.usage.durationMs,
            }),
            updatedAt: new Date(),
          })
          .where(and(eq(scans.tenantId, accountId), eq(scans.id, scanId), patch.status === "failed" ? undefined : ne(scans.status, "failed"))),
      catch: toDbError,
    }).pipe(Effect.asVoid);
  },

  addFiles: (accountId, scanId, files) =>
    files.length === 0
      ? Effect.void
      : Effect.tryPromise({
          try: () =>
            db
              .insert(scanFiles)
              .values(
                files.map((file) => ({
                  tenantId: accountId,
                  scanId,
                  name: file.name,
                  r2Key: file.r2Key,
                  sizeBytes: file.sizeBytes,
                  contentType: file.contentType,
                })),
              )
              .onConflictDoUpdate({
                target: [scanFiles.scanId, scanFiles.name],
                set: { sizeBytes: sql`excluded.size_bytes`, contentType: sql`excluded.content_type`, r2Key: sql`excluded.r2_key` },
              }),
          catch: toDbError,
        }).pipe(Effect.asVoid),

  list: (accountId, limit, cursor, filter): Effect.Effect<ScanPage, DbError> =>
    Effect.tryPromise({
      try: () =>
        db
          .select()
          .from(scans)
          .where(
            and(
              eq(scans.tenantId, accountId),
              cursor ? gt(scans.id, cursor) : undefined,
              filter?.repoId ? eq(scans.repoId, filter.repoId) : undefined,
              filter?.status ? eq(scans.status, filter.status) : undefined,
            ),
          )
          .orderBy(asc(scans.id))
          .limit(limit + 1),
      catch: toDbError,
    }).pipe(
      Effect.flatMap((rows) =>
        withFiles(db, rows.slice(0, limit)).pipe(
          Effect.map((page) => ({ scans: page, nextCursor: rows.length > limit ? rows[limit - 1].id : null })),
        ),
      ),
    ),

  get: (accountId, scanId) =>
    Effect.tryPromise({
      try: () => db.select().from(scans).where(and(eq(scans.tenantId, accountId), eq(scans.id, scanId))),
      catch: toDbError,
    }).pipe(
      Effect.flatMap((rows) => withFiles(db, rows)),
      Effect.map((found) => found[0] ?? null),
    ),

  // -----
  // Callers count these scans and add up their budget caps, so the
  // rows come back with no files, no Runner and no finding counts: a queued or
  // running scan has no summary, and two more queries on the
  // path of every new scan would buy nothing.
  // -----
  activeSince: (accountId, sinceMs) =>
    Effect.tryPromise({
      try: () =>
        db
          .select()
          .from(scans)
          .where(
            and(
              eq(scans.tenantId, accountId),
              or(eq(scans.status, "queued"), eq(scans.status, "running")),
              gte(scans.updatedAt, new Date(sinceMs)),
            ),
          ),
      catch: toDbError,
    }).pipe(Effect.map((rows) => rows.map((row) => scanRowToStatus(row, [], null)))),

  file: (accountId, scanId, name) =>
    Effect.tryPromise({
      try: () =>
        db
          .select({ r2Key: scanFiles.r2Key, contentType: scanFiles.contentType })
          .from(scanFiles)
          .where(and(eq(scanFiles.tenantId, accountId), eq(scanFiles.scanId, scanId), eq(scanFiles.name, name))),
      catch: toDbError,
    }).pipe(Effect.map((rows) => rows[0] ?? null)),
});
