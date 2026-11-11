import type { SubscriptionStatusValue } from "@repo/contracts/elise";

// -----
// The plan an Account is on, as the gates need it. includedCreditUsd is
// what the platform's key may spend for the Account in a UTC month.
// -----
export type PlanState = {
  planKey: string;
  includedCreditUsd: number;
  maxMembers: number;
  status: SubscriptionStatusValue;
  pastDueSince: Date | null;
};

export type ScanBlock = { code: "NO_ACTIVE_PLAN" | "PAYMENT_FAILED"; message: string };
