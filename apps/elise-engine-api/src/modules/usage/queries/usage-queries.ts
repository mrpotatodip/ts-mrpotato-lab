import { and, eq, gte, inArray, sql } from "drizzle-orm";
import { Effect } from "effect";
import { scans, tenantAnthropicKeys, tenants } from "@repo/db-elise/schema";
import type { DbConnectType, PoolDbType } from "#/lib/db-connection";
import { toDbError, type DbError } from "#/lib/effect-query";
import { actorPartyOf, insertAuditEntry } from "#/modules/audit-trail";
import { planOfEffect } from "#/modules/billing";
import { SCANS_ACTIVE_WINDOW_MS } from "#/modules/scans/constants";
import type { MonthSpend } from "#/modules/usage/types";

// -----
// Sums of bigint and numeric columns come back as
// text from the driver; Number() is safe here
// because a month of tokens stays far below 2^53.
// platformCost and platformReserved count only scans on the
// platform's key: the plan's included credit is spent by those.
// -----
export const monthSpendEffect = (db: DbConnectType, tenantId: string, monthStart: Date): Effect.Effect<MonthSpend, DbError> =>
  Effect.gen(function* () {
    const [totals] = yield* Effect.tryPromise({
      try: () =>
        db
          .select({
            cost: sql<string>`coalesce(sum(${scans.costUsd}), 0)`,
            platformCost: sql<string>`coalesce(sum(${scans.costUsd}) filter (where ${scans.keySource} = 'platform'), 0)`,
            count: sql<number>`count(*)::int`,
            input: sql<string>`coalesce(sum(${scans.inputTokens}), 0)`,
            output: sql<string>`coalesce(sum(${scans.outputTokens}), 0)`,
            cacheRead: sql<string>`coalesce(sum(${scans.cacheReadTokens}), 0)`,
            cacheWrite: sql<string>`coalesce(sum(${scans.cacheWriteTokens}), 0)`,
          })
          .from(scans)
          .where(and(eq(scans.tenantId, tenantId), gte(scans.createdAt, monthStart))),
      catch: toDbError,
    });
    const [tenant] = yield* Effect.tryPromise({
      try: () =>
        db
          .select({ budget: tenants.monthlyScanBudgetUsd, allowance: tenants.monthlyScanBudgetAllowanceUsd })
          .from(tenants)
          .where(eq(tenants.id, tenantId)),
      catch: toDbError,
    });
    const [reserved] = yield* Effect.tryPromise({
      try: () =>
        db
          .select({ total: sql<string>`coalesce(sum(${scans.maxBudgetUsd}), 0)` })
          .from(scans)
          .where(
            and(
              eq(scans.tenantId, tenantId),
              eq(scans.keySource, "platform"),
              inArray(scans.status, ["queued", "running"]),
              gte(scans.updatedAt, new Date(Date.now() - SCANS_ACTIVE_WINDOW_MS)),
            ),
          ),
      catch: toDbError,
    });
    const [ownKey] = yield* Effect.tryPromise({
      try: () => db.select({ tenantId: tenantAnthropicKeys.tenantId }).from(tenantAnthropicKeys).where(eq(tenantAnthropicKeys.tenantId, tenantId)),
      catch: toDbError,
    });
    const plan = yield* planOfEffect(db, tenantId);
    return {
      spentUsd: Number(totals.cost),
      platformSpentUsd: Number(totals.platformCost),
      platformReservedUsd: Number(reserved.total),
      ownKey: ownKey !== undefined,
      plan,
      scans: totals.count,
      tokens: {
        input: Number(totals.input),
        output: Number(totals.output),
        cacheRead: Number(totals.cacheRead),
        cacheWrite: Number(totals.cacheWrite),
      },
      budgetOverrideUsd: tenant?.budget == null ? null : Number(tenant.budget),
      budgetAllowanceUsd: tenant?.allowance == null ? null : Number(tenant.allowance),
    };
  });

// -----
// Set the account's own monthly budget, or null to go back to
// the platform default. The change and its audit row commit
// together, so there is no change without a record of who made it.
// -----
export const setMonthlyBudgetEffect = (db: PoolDbType, tenantId: string, userId: string, budgetUsd: number | null): Effect.Effect<void, DbError> =>
  Effect.tryPromise({
    try: () =>
      db.transaction(async (tx) => {
        const actorPartyId = await actorPartyOf(tx, userId);
        const [before] = await tx.select({ budget: tenants.monthlyScanBudgetUsd }).from(tenants).where(eq(tenants.id, tenantId));
        await tx
          .update(tenants)
          .set({ monthlyScanBudgetUsd: budgetUsd === null ? null : budgetUsd.toFixed(2) })
          .where(eq(tenants.id, tenantId));
        await insertAuditEntry(tx, {
          actorPartyId,
          action: "usage.budget.updated",
          subjectId: tenantId,
          tenantId,
          before: { monthlyBudgetUsd: before?.budget == null ? null : Number(before.budget) },
          after: { monthlyBudgetUsd: budgetUsd },
        });
      }),
    catch: toDbError,
  });
