import type { Usage } from "@repo/contracts/elise";
import type { ScanStatus } from "#/schemas";
import type { MonthSpend, UsageEnv } from "#/modules/usage/types";

// -----
// The month is the UTC calendar month, so every
// account rolls over at the same moment.
// -----
export const monthStartOf = (now: Date): Date => new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

export const monthLabelOf = (now: Date): string => now.toISOString().slice(0, 7);

// -----
// A running scan may still spend up to its own cap,
// so a new scan counts that cap as already spent.
// -----
export const reservedUsdOf = (active: readonly ScanStatus[]): number =>
  active.reduce((total, scan) => total + scan.maxBudgetUsd, 0);

// -----
// The budget an account has before an admin sets one: its plan's
// included credit, or the platform default when it has no plan.
// -----
export const defaultBudgetUsdOf = (spend: MonthSpend, defaults: UsageEnv): number => spend.plan?.includedCreditUsd ?? Number(defaults.MONTHLY_BUDGET_USD);

// -----
// The most an admin may set: the allowance the operator gave
// the account, or the platform's sanity maximum when there is none.
// An allowance also caps a budget set before it was lowered.
// -----
export const allowanceUsdOf = (spend: MonthSpend, defaults: UsageEnv): number => spend.budgetAllowanceUsd ?? Number(defaults.BUDGET_ALLOWANCE_USD);

export const budgetUsdOf = (spend: MonthSpend, defaults: UsageEnv): number =>
  Math.min(spend.budgetOverrideUsd ?? defaultBudgetUsdOf(spend, defaults), spend.budgetAllowanceUsd ?? Infinity);

const roundCents = (value: number): number => Math.round(value * 10000) / 10000;

export const summarizeUsage = (now: Date, spend: MonthSpend, defaults: UsageEnv, reservedUsd: number): Usage => {
  const budgetUsd = budgetUsdOf(spend, defaults);
  return {
    month: monthLabelOf(now),
    budgetApplies: spend.budgetOverrideUsd !== null || (spend.plan === null && !spend.ownKey),
    budgetUsd,
    allowanceUsd: allowanceUsdOf(spend, defaults),
    spentUsd: roundCents(spend.spentUsd),
    reservedUsd: roundCents(reservedUsd),
    remainingUsd: roundCents(budgetUsd - spend.spentUsd - reservedUsd),
    scans: spend.scans,
    tokens: spend.tokens,
  };
};
