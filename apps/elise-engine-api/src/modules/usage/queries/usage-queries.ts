import { and, eq, gte, sql } from "drizzle-orm";
import { Effect } from "effect";
import { scanRunnerJobs, scans, tenantAnthropicKeys, tenants } from "@repo/db-elise/schema";
import type { DbConnectType, PoolDbType } from "#/lib/db-connection";
import { toDbError, type DbError } from "#/lib/effect-query";
import { actorPartyOf, insertAuditEntry } from "#/modules/audit-trail";
import { planOfEffect } from "#/modules/billing";
import { liveScansSql } from "#/modules/scan-ledger";
import type { MonthSpend } from "#/modules/usage/types";

// -----
// Sums of bigint and numeric columns come back as
// text from the driver; Number() is safe here
// because a month of tokens stays far below 2^53.
// platformCost and platformReserved count only scans on the
// platform's key: the plan's included credit is spent by those.
// cost and count leave out the scans that ran on a Runner: they
// take nothing from the plan's allowance and cost EliseLAB nothing,
// so they must not use up the allowance or the monthly budget. The
// estimate they carry is for the person to read, not to be spent.
// The five reads do not depend on each other and run together.
// -----
export const monthSpendEffect = (db: DbConnectType, tenantId: string, monthStart: Date): Effect.Effect<MonthSpend, DbError> =>
  Effect.gen(function* () {
    const read = Effect.all(
      {
        totals: Effect.tryPromise({
          try: () =>
            db
              .select({
                cost: sql<string>`coalesce(sum(${scans.costUsd}) filter (where not exists (select 1 from ${scanRunnerJobs} where ${scanRunnerJobs.scanId} = ${scans.id})), 0)`,
                platformCost: sql<string>`coalesce(sum(${scans.costUsd}) filter (where ${scans.keySource} = 'platform'), 0)`,
                count: sql<number>`(count(*) filter (where not exists (select 1 from ${scanRunnerJobs} where ${scanRunnerJobs.scanId} = ${scans.id})))::int`,
                input: sql<string>`coalesce(sum(${scans.inputTokens}), 0)`,
                output: sql<string>`coalesce(sum(${scans.outputTokens}), 0)`,
                cacheRead: sql<string>`coalesce(sum(${scans.cacheReadTokens}), 0)`,
                cacheWrite: sql<string>`coalesce(sum(${scans.cacheWriteTokens}), 0)`,
              })
              .from(scans)
              .where(and(eq(scans.tenantId, tenantId), gte(scans.createdAt, monthStart))),
          catch: toDbError,
        }),
        tenant: Effect.tryPromise({
          try: () =>
            db
              .select({ budget: tenants.monthlyScanBudgetUsd, allowance: tenants.monthlyScanBudgetAllowanceUsd })
              .from(tenants)
              .where(eq(tenants.id, tenantId)),
          catch: toDbError,
        }),
        reserved: Effect.tryPromise({
          try: () =>
            db
              .select({ total: sql<string>`coalesce(sum(${scans.maxBudgetUsd}), 0)` })
              .from(scans)
              .where(
                and(
                  eq(scans.tenantId, tenantId),
                  eq(scans.keySource, "platform"),
                  liveScansSql(Date.now()),
                ),
              ),
          catch: toDbError,
        }),
        ownKey: Effect.tryPromise({
          try: () => db.select({ tenantId: tenantAnthropicKeys.tenantId }).from(tenantAnthropicKeys).where(eq(tenantAnthropicKeys.tenantId, tenantId)),
          catch: toDbError,
        }),
        plan: planOfEffect(db, tenantId),
      },
      { concurrency: "unbounded" },
    );
    const {
      totals: [totals],
      tenant: [tenant],
      reserved: [reserved],
      ownKey: [ownKey],
      plan,
    } = yield* read;
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
