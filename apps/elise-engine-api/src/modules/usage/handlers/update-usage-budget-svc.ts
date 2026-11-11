import { Effect } from "effect";
import type { Usage } from "@repo/contracts/elise";
import type { PoolDbType } from "#/lib/db-connection";
import { Invalid, type DbError } from "#/lib/effect-query";
import type { ScanRepo } from "#/modules/scan-ledger";
import { SCANS_ACTIVE_WINDOW_MS } from "#/modules/scans/constants";
import { setMonthlyBudgetEffect } from "#/modules/usage/queries";
import type { MonthSpend, UsageEnv } from "#/modules/usage/types";
import { allowanceUsdOf, defaultBudgetUsdOf, reservedUsdOf, summarizeUsage } from "#/modules/usage/utils";

// -----
// A budget must be at most the allowance and at least what the month
// has already spent or holds for running scans, so a change can never
// leave an account below money it has already committed. null goes
// back to the platform default, which has to pass the same two rules.
// -----
export const updateUsageBudgetSvc = (
  env: UsageEnv,
  db: PoolDbType,
  repo: ScanRepo,
  accountId: string,
  userId: string,
  requestedUsd: number | null,
  spend: MonthSpend,
): Effect.Effect<Usage, DbError | Invalid> =>
  Effect.gen(function* () {
    const now = Date.now();
    const active = yield* repo.activeSince(accountId, now - SCANS_ACTIVE_WINDOW_MS);
    const reservedUsd = reservedUsdOf(active);
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
    return summarizeUsage(new Date(now), { ...spend, budgetOverrideUsd: requestedUsd }, env, reservedUsd);
  });
