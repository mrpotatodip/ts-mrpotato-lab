import { and, desc, eq, inArray } from "drizzle-orm";
import { Effect } from "effect";
import { z } from "zod";
import { accessAuditLog } from "@repo/db-elise";
import { partyPersons } from "@repo/db-elise/schema";
import type { SettingsChange } from "@repo/contracts/elise";
import type { DbConnectType } from "#/lib/db-connection";
import { toDbError, type DbError } from "#/lib/effect-query";
import { USAGE_SETTINGS_CHANGES_LIMIT } from "#/modules/usage/constants";

const BudgetDetailsSchema = z.object({ monthlyBudgetUsd: z.number().nullable() });
const KeyDetailsSchema = z.object({ lastFour: z.string().nullable() });

const budgetOf = (parsed: ReturnType<typeof BudgetDetailsSchema.safeParse>): number | null => (parsed.success ? parsed.data.monthlyBudgetUsd : null);

const lastFourOf = (parsed: ReturnType<typeof KeyDetailsSchema.safeParse>): string | null => (parsed.success ? parsed.data.lastFour : null);

// -----
// The audit rows of one account's scan settings, newest first: the
// budget, and the Anthropic key being set or removed. The row's
// subject is the account; the actor is named from the person behind
// the login, or null once that login is gone. A key row holds its
// last four characters, never the key.
// -----
export const settingsChangesEffect = (db: DbConnectType, tenantId: string): Effect.Effect<SettingsChange[], DbError> =>
  Effect.tryPromise({
    try: async () => {
      const rows = await db
        .select({ entry: accessAuditLog, person: partyPersons })
        .from(accessAuditLog)
        .leftJoin(partyPersons, eq(partyPersons.partyId, accessAuditLog.actorPartyId))
        .where(and(eq(accessAuditLog.subjectId, tenantId), inArray(accessAuditLog.action, ["usage.budget.updated", "anthropic.key.set", "anthropic.key.removed"])))
        .orderBy(desc(accessAuditLog.createdAt))
        .limit(USAGE_SETTINGS_CHANGES_LIMIT);
      return rows.map(({ entry, person }): SettingsChange => {
        const at = entry.createdAt.toISOString();
        const by = person ? `${person.firstName} ${person.lastName}`.trim() : null;
        if (entry.action === "usage.budget.updated") {
          return { kind: "budget", at, by, fromUsd: budgetOf(BudgetDetailsSchema.safeParse(entry.before)), toUsd: budgetOf(BudgetDetailsSchema.safeParse(entry.after)) };
        }
        if (entry.action === "anthropic.key.set") return { kind: "anthropic_key_set", at, by, lastFour: lastFourOf(KeyDetailsSchema.safeParse(entry.after)) };
        return { kind: "anthropic_key_removed", at, by, lastFour: lastFourOf(KeyDetailsSchema.safeParse(entry.before)) };
      });
    },
    catch: toDbError,
  });
