import { Effect } from "effect";
import type { Usage } from "@repo/contracts/elise";
import type { AppDbType } from "#/lib/db-connection";
import { Invalid, type DbError } from "#/lib/effect-query";
import { activeScansEffect } from "#/modules/scan-ledger";
import { getUsageSvc } from "./get-usage-svc";
import { monthSpendEffect, noticeAudienceEffect, setMonthlyBudgetEffect, type NoticeAudience } from "#/modules/usage/queries";
import type { MonthSpend, UsageEnv } from "#/modules/usage/types";
import { allowanceUsdOf, defaultBudgetUsdOf, monthStartOf, reservedUsdOf, summarizeUsage } from "#/modules/usage/utils";

// -----
// A budget must be at most the allowance and at least what the month
// has already spent or holds for running scans, so a change can never
// leave an account below money it has already committed. null goes
// back to the platform default, which has to pass the same two rules.
// -----
export const setUsageBudgetSvc = (
  env: UsageEnv,
  db: AppDbType,
  accountId: string,
  userId: string,
  requestedUsd: number | null,
  spend: MonthSpend,
  reservedUsd: number,
  now: Date,
): Effect.Effect<Usage, DbError | Invalid> =>
  Effect.gen(function* () {
    const budgetUsd = requestedUsd ?? defaultBudgetUsdOf(spend, env);
    const allowanceUsd = allowanceUsdOf(spend, env);
    if (budgetUsd > allowanceUsd) {
      return yield* new Invalid({ message: `monthlyBudgetUsd: must be at most $${allowanceUsd}, the most this account may set` });
    }
    const committedUsd = spend.spentUsd + reservedUsd;
    if (budgetUsd < committedUsd) {
      return yield* new Invalid({ message: `monthlyBudgetUsd: must be at least $${Math.ceil(committedUsd * 100) / 100}, which this month has already spent or holds for running scans` });
    }
    yield* setMonthlyBudgetEffect(db, accountId, userId, requestedUsd);
    return summarizeUsage(now, { ...spend, budgetOverrideUsd: requestedUsd }, env, reservedUsd);
  });

export type BudgetChange = { usage: Usage; previousBudgetUsd: number; audience: NoticeAudience };

export const changeUsageBudgetSvc = (env: UsageEnv, db: AppDbType, accountId: string, userId: string, requestedUsd: number | null): Effect.Effect<BudgetChange, DbError | Invalid> =>
  Effect.gen(function* () {
    const before = yield* getUsageSvc(env, db, accountId);
    const usage = yield* updateUsageBudgetSvc(env, db, accountId, userId, requestedUsd);
    const audience = yield* noticeAudienceEffect(db, accountId, userId, "company:usage:budget:update");
    return { usage, previousBudgetUsd: before.budgetUsd, audience };
  });

export const updateUsageBudgetSvc = (env: UsageEnv, db: AppDbType, accountId: string, userId: string, requestedUsd: number | null): Effect.Effect<Usage, DbError | Invalid> =>
  Effect.gen(function* () {
    const now = new Date();
    const spend = yield* monthSpendEffect(db, accountId, monthStartOf(now));
    const active = yield* activeScansEffect(db, accountId, now.getTime());
    return yield* setUsageBudgetSvc(env, db, accountId, userId, requestedUsd, spend, reservedUsdOf(active), now);
  });
