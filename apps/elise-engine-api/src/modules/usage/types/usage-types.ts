import type { Bindings } from "#/types/variables";

// -----
// What the database knows about the month so far
// -----
export type MonthSpend = {
  spentUsd: number;
  scans: number;
  tokens: { input: number; output: number; cacheRead: number; cacheWrite: number };
  budgetOverrideUsd: number | null;
};

// -----
// Service inputs
// -----
export type UsageEnv = Pick<Bindings, "REPORTS" | "MONTHLY_BUDGET_USD">;
