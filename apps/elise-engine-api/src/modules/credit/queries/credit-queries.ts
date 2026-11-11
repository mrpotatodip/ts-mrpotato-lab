import { and, eq, sql } from "drizzle-orm";
import { Effect } from "effect";
import { tenantCreditLedger, tenants } from "@repo/db-elise/schema";
import type { DbConnectType, PoolDbType } from "#/lib/db-connection";
import { toDbError, type DbError } from "#/lib/effect-query";
import type { HoldResult, RenewResult, SettleResult } from "#/modules/credit/types";
import { renewalGrantOf, roundUsd } from "#/modules/credit/utils";

// -----
// The sum comes back as text from the driver, and a balance stays
// far below 2^53, so Number() is safe.
// -----
const sumOf = (tenantId: string) =>
  sql<string>`coalesce((select sum(${tenantCreditLedger.amountUsd}) from ${tenantCreditLedger} where ${tenantCreditLedger.tenantId} = ${tenantId}), 0)`;

// -----
// What an Account may spend now: every grant and topup, less every
// charge and every hold of a running scan.
// -----
export const balanceEffect = (db: DbConnectType, tenantId: string): Effect.Effect<number, DbError> =>
  Effect.tryPromise({
    try: async () => {
      const [row] = await db.select({ balance: sumOf(tenantId) }).from(tenants).where(eq(tenants.id, tenantId));
      return Number(row?.balance ?? 0);
    },
    catch: toDbError,
  });

// -----
// Each of these locks the Account's row first, so two scans, or a
// scan and a renewal, cannot read the same balance and both act on it.
// -----
type Tx = Parameters<Parameters<PoolDbType["transaction"]>[0]>[0];
const lockedBalanceOf = async (tx: Tx, tenantId: string): Promise<number> => {
  const [row] = await tx.select({ balance: sumOf(tenantId) }).from(tenants).where(eq(tenants.id, tenantId)).for("update");
  return Number(row?.balance ?? 0);
};

// -----
// Takes the credit a new scan may spend, or says there is not
// enough. A scan holds once: a second call for the same scan finds
// its hold and takes nothing more.
// -----
export const holdCreditEffect = (db: PoolDbType, input: { tenantId: string; scanId: string; holdUsd: number }): Effect.Effect<HoldResult, DbError> =>
  Effect.tryPromise({
    try: () =>
      db.transaction(async (tx) => {
        const balanceUsd = await lockedBalanceOf(tx, input.tenantId);
        const [existing] = await tx
          .select({ id: tenantCreditLedger.id })
          .from(tenantCreditLedger)
          .where(and(eq(tenantCreditLedger.scanId, input.scanId), eq(tenantCreditLedger.kind, "scan_hold")));
        if (existing) return { held: true, balanceUsd };
        if (balanceUsd < input.holdUsd) return { held: false, balanceUsd };
        await tx.insert(tenantCreditLedger).values({
          tenantId: input.tenantId,
          kind: "scan_hold",
          amountUsd: (-input.holdUsd).toFixed(4),
          scanId: input.scanId,
        });
        return { held: true, balanceUsd: roundUsd(balanceUsd - input.holdUsd) };
      }),
    catch: toDbError,
  });

// -----
// Closes a scan's credit: gives the hold back and takes the real
// charge in one row. A scan with no hold (its Account used its own
// key, or it ran before credit) takes nothing. A scan settles once.
// -----
export const settleCreditEffect = (db: PoolDbType, input: { tenantId: string; scanId: string; chargeUsd: number }): Effect.Effect<SettleResult, DbError> =>
  Effect.tryPromise({
    try: () =>
      db.transaction(async (tx) => {
        await lockedBalanceOf(tx, input.tenantId);
        const [hold] = await tx
          .select({ amount: tenantCreditLedger.amountUsd })
          .from(tenantCreditLedger)
          .where(and(eq(tenantCreditLedger.scanId, input.scanId), eq(tenantCreditLedger.kind, "scan_hold")));
        if (!hold) return { settled: false, chargeUsd: 0 };
        const inserted = await tx
          .insert(tenantCreditLedger)
          .values({
            tenantId: input.tenantId,
            kind: "scan_settle",
            amountUsd: roundUsd(-Number(hold.amount) - input.chargeUsd).toFixed(4),
            scanId: input.scanId,
          })
          .onConflictDoNothing()
          .returning({ id: tenantCreditLedger.id });
        return { settled: inserted.length > 0, chargeUsd: input.chargeUsd };
      }),
    catch: toDbError,
  });

// -----
// Adds credit a customer paid for. The key is the Stripe ID of the
// payment: a repeated webhook finds it and adds nothing.
// -----
export const addTopupEffect = (db: DbConnectType, input: { tenantId: string; amountUsd: number; idempotencyKey: string; note?: string }): Effect.Effect<boolean, DbError> =>
  Effect.tryPromise({
    try: async () => {
      const inserted = await db
        .insert(tenantCreditLedger)
        .values({ tenantId: input.tenantId, kind: "topup", amountUsd: input.amountUsd.toFixed(4), idempotencyKey: input.idempotencyKey, note: input.note ?? null })
        .onConflictDoNothing()
        .returning({ id: tenantCreditLedger.id });
      return inserted.length > 0;
    },
    catch: toDbError,
  });

// -----
// Adds a paid period's grant, held below the plan's cap. The key is
// the Stripe invoice ID. A renewal the cap leaves nothing to add to
// still writes a zero grant, so a repeated webhook cannot add credit
// after the customer has spent some.
// -----
export const renewCreditEffect = (
  db: PoolDbType,
  input: { tenantId: string; grantUsd: number; capUsd: number | null; idempotencyKey: string; note?: string },
): Effect.Effect<RenewResult, DbError> =>
  Effect.tryPromise({
    try: () =>
      db.transaction(async (tx) => {
        const balanceUsd = await lockedBalanceOf(tx, input.tenantId);
        const [existing] = await tx
          .select({ id: tenantCreditLedger.id })
          .from(tenantCreditLedger)
          .where(and(eq(tenantCreditLedger.tenantId, input.tenantId), eq(tenantCreditLedger.idempotencyKey, input.idempotencyKey)));
        if (existing) return { grantedUsd: 0, duplicate: true };
        const grantedUsd = renewalGrantOf(balanceUsd, input.grantUsd, input.capUsd);
        await tx.insert(tenantCreditLedger).values({
          tenantId: input.tenantId,
          kind: "grant",
          amountUsd: grantedUsd.toFixed(4),
          idempotencyKey: input.idempotencyKey,
          note: input.note ?? null,
        });
        return { grantedUsd, duplicate: false };
      }),
    catch: toDbError,
  });
