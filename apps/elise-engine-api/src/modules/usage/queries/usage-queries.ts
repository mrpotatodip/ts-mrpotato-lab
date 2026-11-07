import { and, eq, gte, sql } from "drizzle-orm";
import { Effect } from "effect";
import { scans, tenants } from "@repo/db-elise/schema";
import type { DbConnectType } from "#/lib/db-connection";
import { toDbError, type DbError } from "#/lib/effect-query";
import type { MonthSpend } from "#/modules/usage/types";

// -----
// Sums of bigint and numeric columns come back as
// text from the driver; Number() is safe here
// because a month of tokens stays far below 2^53.
// -----
export const monthSpendEffect = (db: DbConnectType, tenantId: string, monthStart: Date): Effect.Effect<MonthSpend, DbError> =>
  Effect.gen(function* () {
    const [totals] = yield* Effect.tryPromise({
      try: () =>
        db
          .select({
            cost: sql<string>`coalesce(sum(${scans.costUsd}), 0)`,
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
      try: () => db.select({ budget: tenants.monthlyScanBudgetUsd }).from(tenants).where(eq(tenants.id, tenantId)),
      catch: toDbError,
    });
    return {
      spentUsd: Number(totals.cost),
      scans: totals.count,
      tokens: {
        input: Number(totals.input),
        output: Number(totals.output),
        cacheRead: Number(totals.cacheRead),
        cacheWrite: Number(totals.cacheWrite),
      },
      budgetOverrideUsd: tenant?.budget == null ? null : Number(tenant.budget),
    };
  });
