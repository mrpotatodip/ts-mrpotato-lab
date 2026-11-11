import type { CreditBalance } from "@repo/contracts/elise";
import type { PlanState } from "#/modules/billing";

// -----
// What the dashboard shows of an Account's credit: the plan and what
// it grants, the balance, and the month's scans against the plan's
// allowance. An Account with no plan has none of it.
// -----
export const creditBalanceOf = (spend: { plan: PlanState | null; scans: number }): CreditBalance => {
  const { plan, scans } = spend;
  if (plan === null) return { planKey: null, keySource: null, balanceUsd: 0, monthlyCreditUsd: 0, scans, scanAllowance: null };
  return {
    planKey: plan.planKey,
    keySource: plan.keySource,
    balanceUsd: plan.creditBalanceUsd,
    monthlyCreditUsd: plan.includedCreditUsd,
    scans,
    scanAllowance: plan.monthlyScanAllowance,
  };
};
