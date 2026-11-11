import { BILLING_GRACE_MS, BILLING_NO_PLAN_MESSAGE, BILLING_PAYMENT_FAILED_MESSAGE } from "#/modules/billing/constants";
import type { PlanState, ScanBlock } from "#/modules/billing/types";

const NO_PLAN: ScanBlock = { code: "NO_ACTIVE_PLAN", message: BILLING_NO_PLAN_MESSAGE };
const PAYMENT_FAILED: ScanBlock = { code: "PAYMENT_FAILED", message: BILLING_PAYMENT_FAILED_MESSAGE };

// -----
// Whether a new scan is refused for the plan. An Account with no plan
// row is refused only once billing is enforced: until then it runs as
// before. A past_due plan keeps working for the grace period, counted
// from when Stripe first said so. Canceled and incomplete plans are no
// plan; an unpaid one is a payment that failed for good.
// -----
export const scanBlockOf = (plan: PlanState | null, enforced: boolean, now: Date): ScanBlock | null => {
  if (plan === null) return enforced ? NO_PLAN : null;
  switch (plan.status) {
    case "active":
      return null;
    case "past_due":
      return plan.pastDueSince !== null && now.getTime() - plan.pastDueSince.getTime() >= BILLING_GRACE_MS ? PAYMENT_FAILED : null;
    case "unpaid":
      return PAYMENT_FAILED;
    default:
      return NO_PLAN;
  }
};
