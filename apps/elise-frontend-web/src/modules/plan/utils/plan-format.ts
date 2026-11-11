import type { CreditEntry, PlanDetails } from "@repo/contracts/elise";
import { usageUsd } from "#/modules/usage";

type StatusView = { label: string; variant: "success" | "warning" | "destructive" | "neutral"; note: string | null };

// -----
// How a subscription's status reads. An active plan says nothing
// more; any other status says what it means for scans, in a
// sentence, and no date the engine does not report.
// -----
export const PLAN_STATUS_VIEW = {
  active: { label: "Active", variant: "success", note: null },
  past_due: { label: "Payment failed", variant: "warning", note: "Payment failed. Scans keep running until the grace period ends." },
  unpaid: { label: "Unpaid", variant: "destructive", note: "Scans are paused until the plan is active again." },
  canceled: { label: "Canceled", variant: "destructive", note: "Scans are paused until the plan is active again." },
  incomplete: { label: "Not active yet", variant: "neutral", note: "The plan is not active yet." },
} as const satisfies Record<NonNullable<PlanDetails["status"]>, StatusView>;

export const planSourceLabel = (source: NonNullable<PlanDetails["source"]>) => (source === "grant" ? "Granted by us" : "Stripe");

export const planKeyLabel = (keySource: NonNullable<PlanDetails["plan"]>["keySource"]) =>
  keySource === "account" ? "Your own Anthropic key" : "Our key, paid with credit";

// -----
// The same count the invite limit uses: people in the account plus
// invites still waiting, against what the plan holds.
// -----
export const planSeatsLabel = (seats: PlanDetails["seats"], maxMembers: number) => {
  const used = `${seats.members + seats.pendingInvites} of ${maxMembers} people`;
  if (seats.pendingInvites === 0) return used;
  return `${used}, including ${seats.pendingInvites} waiting invite${seats.pendingInvites === 1 ? "" : "s"}`;
};

const RENEWS = new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });

export const planDateLabel = (iso: string) => {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : RENEWS.format(date);
};

export const CREDIT_ENTRY_LABEL = {
  grant: "Monthly credit",
  topup: "Top-up",
  scan_hold: "Held for a running scan",
  scan_settle: "Scan",
  expiry: "Expired",
  adjustment: "Adjustment",
} as const satisfies Record<CreditEntry["kind"], string>;

// -----
// Credit added reads with a plus, credit taken with a minus.
// -----
export const creditAmountLabel = (amountUsd: number) => (amountUsd > 0 ? `+${usageUsd(amountUsd)}` : usageUsd(amountUsd));
