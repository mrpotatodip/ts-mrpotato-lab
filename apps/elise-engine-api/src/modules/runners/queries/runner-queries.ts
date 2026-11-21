import { and, desc, eq, exists, gt, inArray, isNull } from "drizzle-orm";
import { Effect } from "effect";
import { partyPersons, scanFindings, scanRunnerJobs, scans, tenantRunners, tenants } from "@repo/db-elise";
import type { Runner, RunnerIdentity } from "@repo/contracts/elise";
import type { AppDbType, DbConnectType } from "#/lib/db-connection";
import { Forbidden, toDbError, type DbError } from "#/lib/effect-query";
import { actorPartyOf } from "#/modules/audit-trail";
import type { NewRunner, PairingClaim } from "#/modules/runners/types";

type RunnerRow = { id: string; name: string; tenantId: string };

const identityOf = (db: DbConnectType, row: RunnerRow): Effect.Effect<RunnerIdentity, DbError> =>
  Effect.tryPromise({
    try: () => db.select({ name: tenants.name }).from(tenants).where(eq(tenants.id, row.tenantId)),
    catch: toDbError,
  }).pipe(Effect.map(([tenant]) => ({ runnerId: row.id, name: row.name, accountId: row.tenantId, accountName: tenant?.name ?? "" })));

export const identityOrNull = (db: DbConnectType, rows: RunnerRow[]): Effect.Effect<RunnerIdentity | null, DbError> => {
  const [row] = rows;
  return row ? identityOf(db, row) : Effect.succeed(null);
};

// -----
// A row that holds only a pairing code: no token yet. The
// answer has the id and the expiry, never a hash.
// -----
export const createRunnerEffect = (db: AppDbType, runner: NewRunner): Effect.Effect<{ id: string; name: string; expiresAt: string }, Forbidden | DbError> =>
  Effect.tryPromise({
    try: async () => {
      const createdBy = await actorPartyOf(db, runner.actorUserId);
      if (!createdBy) return null;
      const [row] = await db
        .insert(tenantRunners)
        .values({ tenantId: runner.tenantId, name: runner.name, pairingCodeHash: runner.codeHash, pairingExpiresAt: runner.expiresAt, createdBy })
        .returning({ id: tenantRunners.id, name: tenantRunners.name });
      return row ? { id: row.id, name: row.name, expiresAt: runner.expiresAt.toISOString() } : null;
    },
    catch: toDbError,
  }).pipe(Effect.flatMap((created) => (created ? Effect.succeed(created) : Effect.fail(new Forbidden({ message: "Forbidden" })))));

// -----
// Pairing is one UPDATE. It matches only a code that is
// unexpired, unused and not revoked, and it clears the code
// as it sets the token hash, so two requests with one code
// cannot both win. No match is null: the caller does not
// learn which of the conditions failed.
// -----
export const claimPairingEffect = (db: DbConnectType, claim: PairingClaim): Effect.Effect<RunnerIdentity | null, DbError> =>
  Effect.tryPromise({
    try: () =>
      db
        .update(tenantRunners)
        .set({ pairingCodeHash: null, pairingExpiresAt: null, tokenHash: claim.tokenHash, pairedAt: claim.now, lastSeenAt: claim.now })
        .where(and(eq(tenantRunners.pairingCodeHash, claim.codeHash), gt(tenantRunners.pairingExpiresAt, claim.now), isNull(tenantRunners.revokedAt)))
        .returning({ id: tenantRunners.id, name: tenantRunners.name, tenantId: tenantRunners.tenantId }),
    catch: toDbError,
  }).pipe(Effect.flatMap((rows) => identityOrNull(db, rows)));

// -----
// The Account's Runners, newest first, without the removed
// ones. The state is read from the row: a token means
// connected, else an unexpired code means waiting.
// -----
export const listRunnersEffect = (db: AppDbType, tenantId: string, now: Date): Effect.Effect<Runner[], DbError> =>
  Effect.tryPromise({
    try: () =>
      db
        .select({ runner: tenantRunners, firstName: partyPersons.firstName, lastName: partyPersons.lastName })
        .from(tenantRunners)
        .leftJoin(partyPersons, eq(partyPersons.partyId, tenantRunners.createdBy))
        .where(and(eq(tenantRunners.tenantId, tenantId), isNull(tenantRunners.revokedAt)))
        .orderBy(desc(tenantRunners.createdAt)),
    catch: toDbError,
  }).pipe(
    Effect.map((rows) =>
      rows.map(({ runner: row, firstName, lastName }): Runner => {
        const live = row.pairingExpiresAt !== null && row.pairingExpiresAt > now;
        return {
          id: row.id,
          name: row.name,
          state: row.tokenHash !== null ? "connected" : live ? "waiting" : "expired",
          createdAt: row.createdAt.toISOString(),
          expiresAt: row.pairingExpiresAt?.toISOString() ?? null,
          pairedAt: row.pairedAt?.toISOString() ?? null,
          lastSeenAt: row.lastSeenAt?.toISOString() ?? null,
          createdByName: firstName === null ? null : `${firstName} ${lastName}`.trim(),
        };
      }),
    ),
  );

// -----
// An admin removes a Runner of the Account. Its token stops
// working and an unused code is cleared. The Scan it is
// running (a claimed job) is stopped in the same statement (one
// CTE chain), so it never stays running after its Runner is gone. False when the
// Account has no such live Runner.
// -----
export const removeRunnerEffect = (db: AppDbType, tenantId: string, runnerId: string, now: Date): Effect.Effect<boolean, DbError> =>
  Effect.tryPromise({
    try: async () => {
      const revoked = db.$with("revoked").as(
        db
          .update(tenantRunners)
          .set({ revokedAt: now, pairingCodeHash: null, pairingExpiresAt: null })
          .where(and(eq(tenantRunners.id, runnerId), eq(tenantRunners.tenantId, tenantId), isNull(tenantRunners.revokedAt)))
          .returning({ id: tenantRunners.id }),
      );
      const cancelled = db.$with("cancelled").as(
        db
          .update(scanRunnerJobs)
          .set({ state: "cancelled", finishedAt: now })
          .where(and(eq(scanRunnerJobs.runnerId, runnerId), eq(scanRunnerJobs.tenantId, tenantId), eq(scanRunnerJobs.state, "claimed"), exists(db.select({ id: revoked.id }).from(revoked))))
          .returning({ scanId: scanRunnerJobs.scanId }),
      );
      const stopped = db.$with("stopped").as(
        db
          .update(scans)
          .set({ status: "stopped", step: null, finishedAt: now, updatedAt: now })
          .where(and(eq(scans.tenantId, tenantId), inArray(scans.status, ["queued", "running"]), inArray(scans.id, db.select({ scanId: cancelled.scanId }).from(cancelled))))
          .returning({ id: scans.id }),
      );
      const cleared = db.$with("cleared").as(
        db
          .delete(scanFindings)
          .where(inArray(scanFindings.scanId, db.select({ id: stopped.id }).from(stopped)))
          .returning({ id: scanFindings.id }),
      );
      const rows = await db.with(revoked, cancelled, stopped, cleared).select({ id: revoked.id }).from(revoked);
      return rows.length > 0;
    },
    catch: toDbError,
  });

// -----
// A Runner stops itself: its token no longer works. False
// when no live Runner holds the token.
// -----
export const revokeRunnerByTokenEffect = (db: DbConnectType, tokenHash: string, now: Date): Effect.Effect<boolean, DbError> =>
  Effect.tryPromise({
    try: () =>
      db
        .update(tenantRunners)
        .set({ revokedAt: now })
        .where(and(eq(tenantRunners.tokenHash, tokenHash), isNull(tenantRunners.revokedAt)))
        .returning({ id: tenantRunners.id }),
    catch: toDbError,
  }).pipe(Effect.map((rows) => rows.length > 0));

// -----
// Who a paired Runner is, or null for a token that is
// unknown or revoked. Asking also records that it was
// seen, so "last seen" costs no extra request.
// -----
export const findRunnerByTokenEffect = (db: DbConnectType, tokenHash: string, now: Date): Effect.Effect<RunnerIdentity | null, DbError> =>
  Effect.tryPromise({
    try: () =>
      db
        .update(tenantRunners)
        .set({ lastSeenAt: now })
        .where(and(eq(tenantRunners.tokenHash, tokenHash), isNull(tenantRunners.revokedAt)))
        .returning({ id: tenantRunners.id, name: tenantRunners.name, tenantId: tenantRunners.tenantId }),
    catch: toDbError,
  }).pipe(Effect.flatMap((rows) => identityOrNull(db, rows)));
