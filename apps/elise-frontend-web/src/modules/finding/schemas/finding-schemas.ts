import { FINDING_TRIAGE_STATUS_VALUES, REPO_FINDING_STATE_VALUES } from "@repo/contracts/elise";

export { FindingTriageBodySchema, FindingTriageSchema } from "@repo/contracts/elise";
export type { Finding, FindingTriage, FindingTriageBody } from "@repo/contracts/elise";

export type FindingTriageStatus = (typeof FINDING_TRIAGE_STATUS_VALUES)[number];
export type FindingState = (typeof REPO_FINDING_STATE_VALUES)[number];
