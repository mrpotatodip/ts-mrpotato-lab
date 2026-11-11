import { and, eq, gt, isNull, sql } from "drizzle-orm";
import { Effect } from "effect";
import type { PlanDetails } from "@repo/contracts/elise";
import { partyRoles, platformMasterPlans, tenantSubscriptions, tenantTeamInvites } from "@repo/db-elise/schema";
import type { DbConnectType } from "#/lib/db-connection";
import { toDbError, type DbError } from "#/lib/effect-query";
import { monthSpendEffect, monthStartOf } from "#/modules/usage";

// -----
// What the Plan page shows: the plan, how the subscription stands,
// the month's scans, and the people the plan holds. The seat count
// is the one the invite limit uses: people in the account plus
// invites still waiting. An account with no plan has no plan or
// subscription fields, but still has its seats and scans.
// -----
export const planDetailsEffect = (db: DbConnectType, tenantId: string, now: Date): Effect.Effect<PlanDetails, DbError> =>
  Effect.gen(function* () {
    const row = yield* Effect.tryPromise({
      try: async () => {
        const [found] = await db
          .select({
            key: platformMasterPlans.key,
            label: platformMasterPlans.label,
            price: platformMasterPlans.monthlyPriceUsd,
            credit: platformMasterPlans.includedCreditUsd,
            carryCap: platformMasterPlans.carryCapUsd,
            keySource: platformMasterPlans.keySource,
            allowance: platformMasterPlans.monthlyScanAllowance,
            maxMembers: platformMasterPlans.maxMembers,
            status: tenantSubscriptions.status,
            source: tenantSubscriptions.source,
            periodEnd: tenantSubscriptions.currentPeriodEnd,
          })
          .from(tenantSubscriptions)
          .innerJoin(platformMasterPlans, eq(platformMasterPlans.id, tenantSubscriptions.planId))
          .where(eq(tenantSubscriptions.tenantId, tenantId));
        return found;
      },
      catch: toDbError,
    });
    const seats = yield* Effect.tryPromise({
      try: async () => {
        const [{ members }] = await db
          .select({ members: sql<number>`count(distinct ${partyRoles.partyId})::int` })
          .from(partyRoles)
          .where(eq(partyRoles.tenantId, tenantId));
        const [{ pendingInvites }] = await db
          .select({ pendingInvites: sql<number>`count(*)::int` })
          .from(tenantTeamInvites)
          .where(
            and(eq(tenantTeamInvites.tenantId, tenantId), isNull(tenantTeamInvites.revokedAt), isNull(tenantTeamInvites.acceptedAt), gt(tenantTeamInvites.expiresAt, now)),
          );
        return { members, pendingInvites };
      },
      catch: toDbError,
    });
    const { scans } = yield* monthSpendEffect(db, tenantId, monthStartOf(now));
    return {
      plan: row
        ? {
            key: row.key,
            label: row.label,
            monthlyPriceUsd: Number(row.price),
            includedCreditUsd: Number(row.credit),
            carryCapUsd: row.carryCap === null ? null : Number(row.carryCap),
            keySource: row.keySource,
            scanAllowance: row.allowance,
            maxMembers: row.maxMembers,
          }
        : null,
      status: row?.status ?? null,
      source: row?.source ?? null,
      currentPeriodEnd: row?.periodEnd?.toISOString() ?? null,
      scans,
      seats,
    };
  });
