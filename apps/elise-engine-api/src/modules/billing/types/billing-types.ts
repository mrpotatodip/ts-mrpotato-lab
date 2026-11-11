import type { ScanKeySourceValue, SubscriptionStatusValue } from "@repo/contracts/elise";

// -----
// The plan an Account is on, as the gates need it. includedCreditUsd is
// what a paid period adds to the balance. keySource is the key the
// plan's scans use. creditMarkup multiplies a scan's cost into the
// credit it takes. creditBalanceUsd is the Account's balance now, holds
// of running scans already out. monthlyScanAllowance is the most scans
// a UTC month allows, null for no limit.
// -----
export type PlanState = {
  planKey: string;
  includedCreditUsd: number;
  keySource: ScanKeySourceValue;
  creditMarkup: number;
  creditBalanceUsd: number;
  monthlyScanAllowance: number | null;
  maxMembers: number;
  status: SubscriptionStatusValue;
  pastDueSince: Date | null;
};

export type ScanBlock = { code: "NO_ACTIVE_PLAN" | "PAYMENT_FAILED"; message: string };
