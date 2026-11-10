import { and, desc, eq } from "drizzle-orm";
import { Effect } from "effect";
import { z } from "zod";
import { accessAuditLog } from "@repo/db-elise";
import { partyPersons } from "@repo/db-elise/schema";
import type { UsageBudgetChange } from "@repo/contracts/elise";
import type { DbConnectType } from "#/lib/db-connection";
import { toDbError, type DbError } from "#/lib/effect-query";
import { USAGE_BUDGET_CHANGES_LIMIT } from "#/modules/usage/constants";

const BudgetDetailsSchema = z.object({ monthlyBudgetUsd: z.number().nullable() });

const budgetOf = (parsed: ReturnType<typeof BudgetDetailsSchema.safeParse>): number | null => (parsed.success ? parsed.data.monthlyBudgetUsd : null);

// -----
// The audit rows of one account's budget changes, newest first. The
// row's subject is the account; the actor is named from the person
// behind the login, or null once that login is gone.
// -----
export const budgetChangesEffect = (db: DbConnectType, tenantId: string): Effect.Effect<UsageBudgetChange[], DbError> =>
  Effect.tryPromise({
    try: async () => {
      const rows = await db
        .select({ entry: accessAuditLog, person: partyPersons })
        .from(accessAuditLog)
        .leftJoin(partyPersons, eq(partyPersons.partyId, accessAuditLog.actorPartyId))
        .where(and(eq(accessAuditLog.subjectId, tenantId), eq(accessAuditLog.action, "usage.budget.updated")))
        .orderBy(desc(accessAuditLog.createdAt))
        .limit(USAGE_BUDGET_CHANGES_LIMIT);
      return rows.map(({ entry, person }) => ({
        at: entry.createdAt.toISOString(),
        by: person ? `${person.firstName} ${person.lastName}`.trim() : null,
        fromUsd: budgetOf(BudgetDetailsSchema.safeParse(entry.before)),
        toUsd: budgetOf(BudgetDetailsSchema.safeParse(entry.after)),
      }));
    },
    catch: toDbError,
  });
