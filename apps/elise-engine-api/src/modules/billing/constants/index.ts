// -----
// How long scans keep working after Stripe first reports a failed payment
// -----
export const BILLING_GRACE_MS = 7 * 24 * 60 * 60 * 1000;

export const BILLING_NO_PLAN_MESSAGE = "This account has no active plan. Subscribe in Settings to run scans.";
export const BILLING_PAYMENT_FAILED_MESSAGE = "The last payment failed. Update the payment method in Settings to run scans.";
