import { eq } from "drizzle-orm";
import { Effect } from "effect";
import { platformMasterPlans, tenantSubscriptions } from "@repo/db-elise";
import type { DbConnectType } from "#/lib/db-connection";
import { balanceEffect } from "#/modules/credit";
import { toDbError, type DbError } from "#/lib/effect-query";
import type { PlanState } from "#/modules/billing/types";

// -----
// The plan of an Account, or null when it has none, with the
// Account's credit balance as it stands.
// -----
export const planOfEffect = (db: DbConnectType, tenantId: string): Effect.Effect<PlanState | null, DbError> =>
  Effect.gen(function* () {
    const row = yield* Effect.tryPromise({
      try: async () => {
        const [found] = await db
          .select({
            key: platformMasterPlans.key,
            credit: platformMasterPlans.includedCreditUsd,
            keySource: platformMasterPlans.keySource,
            markup: platformMasterPlans.creditMarkup,
            allowance: platformMasterPlans.monthlyScanAllowance,
            maxMembers: platformMasterPlans.maxMembers,
            status: tenantSubscriptions.status,
            pastDueSince: tenantSubscriptions.pastDueSince,
          })
          .from(tenantSubscriptions)
          .innerJoin(platformMasterPlans, eq(platformMasterPlans.id, tenantSubscriptions.planId))
          .where(eq(tenantSubscriptions.tenantId, tenantId));
        return found;
      },
      catch: toDbError,
    });
    if (!row) return null;
    const creditBalanceUsd = yield* balanceEffect(db, tenantId);
    return {
      planKey: row.key,
      includedCreditUsd: Number(row.credit),
      keySource: row.keySource,
      creditMarkup: Number(row.markup),
      creditBalanceUsd,
      monthlyScanAllowance: row.allowance,
      maxMembers: row.maxMembers,
      status: row.status,
      pastDueSince: row.pastDueSince,
    };
  });
