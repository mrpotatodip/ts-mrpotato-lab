import type { scanFindings, scanRepoFindings, scans } from "@repo/db-elise/schema";
import type { FindingOriginValue, FindingSeverityValue, FindingStatusValue, FindingTriageStatusValue } from "@repo/contracts/elise";
import type { LiteFinding, Recheck } from "#/modules/scan-records/schemas";
import type { Bindings } from "#/types/variables";

// -----
// Rows to write
// -----
export type NewScanRow = typeof scans.$inferInsert;
export type NewFindingRow = typeof scanFindings.$inferInsert;
// -----
// The branch a scan belongs to: id is null for a one-off scan
// (no History) and reason says why; name is the branch it read,
// when known.
// -----
export type ScanBranch = { id: string | null; name: string | null; reason: string | null };
export type ScanRecord = { scan: NewScanRow; findings: NewFindingRow[]; history: NewHistoryRow[] };

// -----
// Service inputs
// -----
export type RecordScanEnv = Pick<Bindings, "REPORTS" | "DATABASE_URL">;

// -----
// History: what a repo's problems look like before and
// after a scan
// -----
export type HistoryRow = typeof scanRepoFindings.$inferSelect;
export type NewHistoryRow = typeof scanRepoFindings.$inferInsert;

// -----
// A problem the agent is asked to re-check. priorId is
// its fingerprint. The words come from the scan that
// last saw it.
// -----
export type PriorFinding = {
  priorId: string;
  status: FindingStatusValue;
  severity: FindingSeverityValue | null;
  title: string;
  class: string;
  file: string | null;
  line: number | null;
};

export type FoundFinding = { finding: LiteFinding; fingerprint: string };

export type PlannedFinding = { finding: LiteFinding; fingerprint: string; origin: FindingOriginValue };

export type PriorTally = { given: number; carried: number; closed: number; unchecked: number };

export type HistoryPlan = { findings: PlannedFinding[]; history: NewHistoryRow[]; tally: PriorTally };

export type PlanInput = {
  scanId: string;
  repoId: string;
  branchId: string;
  tenantId: string;
  history: Map<string, HistoryRow>;
  triage: Map<string, FindingTriageStatusValue>;
  given: PriorFinding[];
  found: FoundFinding[];
  recheck: Recheck;
};

export type HistoryContext = Pick<PlanInput, "history" | "triage" | "given">;
