import { z } from "zod";
import { FINDING_TRIAGE_STATUS_VALUES, REPO_FINDING_STATE_VALUES } from "@repo/contracts/elise";

// -----
// The accept-risk dialog: why, and for how many days (a select, so a string).
// -----
export const RiskDetailsSchema = z.object({
  note: z.string().trim().min(1, "Write why it is acceptable to ship with this, so the next person understands the decision."),
  days: z.string(),
});

export { FindingTriageBodySchema, FindingTriageSchema } from "@repo/contracts/elise";
export type { Finding, FindingTriage, FindingTriageBody } from "@repo/contracts/elise";

export type FindingTriageStatus = (typeof FINDING_TRIAGE_STATUS_VALUES)[number];
export type FindingState = (typeof REPO_FINDING_STATE_VALUES)[number];
