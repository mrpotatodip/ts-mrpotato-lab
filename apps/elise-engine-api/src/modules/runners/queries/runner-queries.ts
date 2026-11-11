import { and, eq, gt, isNull } from "drizzle-orm";
import { Effect } from "effect";
import { tenantRunners, tenants } from "@repo/db-elise";
import type { RunnerIdentity } from "@repo/contracts/elise";
import type { DbConnectType } from "#/lib/db-connection";
import { Forbidden, toDbError, type DbError } from "#/lib/effect-query";
import { actorPartyOf } from "#/modules/audit-trail";
import type { NewRunner, PairingClaim } from "#/modules/runners/types";

type RunnerRow = { id: string; name: string; tenantId: string };

const identityOf = (db: DbConnectType, row: RunnerRow): Effect.Effect<RunnerIdentity, DbError> =>
  Effect.tryPromise({
    try: () => db.select({ name: tenants.name }).from(tenants).where(eq(tenants.id, row.tenantId)),
    catch: toDbError,
  }).pipe(Effect.map(([tenant]) => ({ runnerId: row.id, name: row.name, accountId: row.tenantId, accountName: tenant?.name ?? "" })));

const identityOrNull = (db: DbConnectType, rows: RunnerRow[]): Effect.Effect<RunnerIdentity | null, DbError> => {
  const [row] = rows;
  return row ? identityOf(db, row) : Effect.succeed(null);
};

// -----
// A row that holds only a pairing code: no token yet. The
// answer has the id and the expiry, never a hash.
// -----
export const createRunnerEffect = (db: DbConnectType, runner: NewRunner): Effect.Effect<{ id: string; name: string; expiresAt: string }, Forbidden | DbError> =>
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
