import type { PlanState } from "#/modules/billing";
import type { Bindings } from "#/types/variables";

// -----
// What the database knows about the month so far. platformSpentUsd and
// platformReservedUsd are the part spent, or held by running scans, on
// the platform's key; ownKey says the account brought its own, which
// the next scan will use; plan is null when the account has none.
// -----
export type MonthSpend = {
  spentUsd: number;
  platformSpentUsd: number;
  platformReservedUsd: number;
  ownKey: boolean;
  plan: PlanState | null;
  scans: number;
  tokens: { input: number; output: number; cacheRead: number; cacheWrite: number };
  budgetOverrideUsd: number | null;
  budgetAllowanceUsd: number | null;
};

// -----
// Service inputs
// -----
export type UsageEnv = Pick<Bindings, "MONTHLY_BUDGET_USD" | "BUDGET_ALLOWANCE_USD">;
