import { eq } from "drizzle-orm";
import { Effect } from "effect";
import { platformMasterPlans, tenantSubscriptions } from "@repo/db-elise";
import type { DbConnectType } from "#/lib/db-connection";
import { toDbError, type DbError } from "#/lib/effect-query";
import type { PlanState } from "#/modules/billing/types";

// -----
// The plan of an Account, or null when it has none.
// -----
export const planOfEffect = (db: DbConnectType, tenantId: string): Effect.Effect<PlanState | null, DbError> =>
  Effect.tryPromise({
    try: async () => {
      const [row] = await db
        .select({
          key: platformMasterPlans.key,
          credit: platformMasterPlans.includedCreditUsd,
          maxMembers: platformMasterPlans.maxMembers,
          status: tenantSubscriptions.status,
          pastDueSince: tenantSubscriptions.pastDueSince,
        })
        .from(tenantSubscriptions)
        .innerJoin(platformMasterPlans, eq(platformMasterPlans.id, tenantSubscriptions.planId))
        .where(eq(tenantSubscriptions.tenantId, tenantId));
      return row ? { planKey: row.key, includedCreditUsd: Number(row.credit), maxMembers: row.maxMembers, status: row.status, pastDueSince: row.pastDueSince } : null;
    },
    catch: toDbError,
  });
