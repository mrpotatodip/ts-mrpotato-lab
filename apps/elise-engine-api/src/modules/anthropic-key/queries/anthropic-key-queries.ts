import { eq } from "drizzle-orm";
import { Data, Effect } from "effect";
import { tenantAnthropicKeys } from "@repo/db-elise";
import type { AnthropicKey } from "@repo/contracts/elise";
import type { DbConnectType, PoolDbType } from "#/lib/db-connection";
import { Forbidden, toDbError, type DbError } from "#/lib/effect-query";
import { actorPartyOf, insertAuditEntry } from "#/modules/audit-trail";

const PLATFORM_KEY: AnthropicKey = { source: "platform", lastFour: null, updatedAt: null };

// -----
// What the dashboard may know about the account's key: whether one
// is set, and its last four characters. Never the key.
// -----
export const findAnthropicKeyEffect = (db: DbConnectType, tenantId: string): Effect.Effect<AnthropicKey, DbError> =>
  Effect.tryPromise({
    try: async () => {
      const [row] = await db
        .select({ lastFour: tenantAnthropicKeys.lastFour, updatedAt: tenantAnthropicKeys.updatedAt })
        .from(tenantAnthropicKeys)
        .where(eq(tenantAnthropicKeys.tenantId, tenantId));
      return row ? { source: "account" as const, lastFour: row.lastFour, updatedAt: row.updatedAt.toISOString() } : PLATFORM_KEY;
    },
    catch: toDbError,
  });

// -----
// The sealed key a scan hands to Outbound, or null for the platform key.
// -----
export const findSealedKeyEffect = (db: DbConnectType, tenantId: string): Effect.Effect<string | null, DbError> =>
  Effect.tryPromise({
    try: async () => {
      const [row] = await db.select({ sealedKey: tenantAnthropicKeys.sealedKey }).from(tenantAnthropicKeys).where(eq(tenantAnthropicKeys.tenantId, tenantId));
      return row?.sealedKey ?? null;
    },
    catch: toDbError,
  });

// -----
// Thrown inside a transaction to roll it back.
// -----
class Refused extends Data.TaggedError("Refused")<{ failure: Forbidden }> {}

const classify = (cause: unknown): Forbidden | DbError => (cause instanceof Refused ? cause.failure : toDbError(cause));

// -----
// Save the account's key, replacing any earlier one, and write who did
// it to the audit trail in the same transaction. The audit row holds
// the last four characters, never the key.
// -----
export const saveAnthropicKeyEffect = (db: PoolDbType, tenantId: string, userId: string, sealedKey: string, lastFour: string): Effect.Effect<AnthropicKey, Forbidden | DbError> =>
  Effect.tryPromise({
    try: () =>
      db.transaction(async (tx) => {
        const actorPartyId = await actorPartyOf(tx, userId);
        if (!actorPartyId) throw new Refused({ failure: new Forbidden({ message: "Forbidden" }) });
        const [row] = await tx
          .insert(tenantAnthropicKeys)
          .values({ tenantId, sealedKey, lastFour, updatedBy: actorPartyId })
          .onConflictDoUpdate({ target: tenantAnthropicKeys.tenantId, set: { sealedKey, lastFour, updatedBy: actorPartyId } })
          .returning({ updatedAt: tenantAnthropicKeys.updatedAt });
        await insertAuditEntry(tx, { actorPartyId, action: "anthropic.key.set", subjectId: tenantId, tenantId, after: { lastFour } });
        return { source: "account" as const, lastFour, updatedAt: row.updatedAt.toISOString() };
      }),
    catch: classify,
  });

// -----
// Go back to the platform key. Removing a key that is not there
// changes nothing and writes no audit row.
// -----
export const removeAnthropicKeyEffect = (db: PoolDbType, tenantId: string, userId: string): Effect.Effect<AnthropicKey, DbError> =>
  Effect.tryPromise({
    try: () =>
      db.transaction(async (tx) => {
        const [removed] = await tx.delete(tenantAnthropicKeys).where(eq(tenantAnthropicKeys.tenantId, tenantId)).returning({ lastFour: tenantAnthropicKeys.lastFour });
        if (removed) {
          const actorPartyId = await actorPartyOf(tx, userId);
          await insertAuditEntry(tx, { actorPartyId, action: "anthropic.key.removed", subjectId: tenantId, tenantId, before: { lastFour: removed.lastFour } });
        }
        return PLATFORM_KEY;
      }),
    catch: toDbError,
  });
