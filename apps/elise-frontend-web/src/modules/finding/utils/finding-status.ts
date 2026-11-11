import type { FindingState, FindingTriage } from "../schemas";

export type FindingStatusKey = "open" | "came_back" | "fixed_by_scan" | "marked_fixed" | "false_positive" | "accepted_risk";
export type FindingGroup = "action" | "decided" | "scan";

const RESOLVED_BY_PERSON: ReadonlySet<string> = new Set(["fixed", "false_positive", "accepted_risk"]);

export const isResolvedByPerson = (triage: FindingTriage | null) => triage !== null && RESOLVED_BY_PERSON.has(triage.status);

// -----
// A finding has two truths: what the scans found (its state) and what a
// person decided. One word for the reader comes from both: a scan that proved
// a fix wins over any decision, then a person's decision, then the state.
// -----
export function findingStatusKey(state: FindingState, triage: FindingTriage | null): FindingStatusKey {
  if (state === "fixed_by_code") return "fixed_by_scan";
  if (triage?.status === "fixed") return "marked_fixed";
  if (triage?.status === "false_positive") return "false_positive";
  if (triage?.status === "accepted_risk") return "accepted_risk";
  return state === "regressed" ? "came_back" : "open";
}

// -----
// The same grouping the repository tile uses for "Open findings": a finding
// needs action when a scan still sees it and no person has resolved it.
// -----
export function findingGroup(state: FindingState, triage: FindingTriage | null): FindingGroup {
  if (state === "fixed_by_code") return "scan";
  return isResolvedByPerson(triage) ? "decided" : "action";
}

export const FINDING_STATUS_BADGE = {
  open: { label: "Open", variant: "outline" },
  came_back: { label: "Came back", variant: "destructive" },
  fixed_by_scan: { label: "Fixed by a scan", variant: "success" },
  marked_fixed: { label: "Marked fixed", variant: "success" },
  false_positive: { label: "False positive", variant: "neutral" },
  accepted_risk: { label: "Risk accepted", variant: "warning" },
} as const satisfies Record<FindingStatusKey, { label: string; variant: "outline" | "destructive" | "success" | "neutral" | "warning" }>;
