// -----
// Scan options
// -----
export { SCAN_EFFORTS, SCAN_MODELS, SCAN_PROFILES, SCAN_SKILLS } from "@repo/contracts/elise";
export const SCAN_AGENT_BUDGET_MAX = 200;

// -----
// Saved files
// -----
export const SCAN_REPORT_FILES = [
  "REPORT.md",
  "findings.json",
  "FINDINGS-DETAIL.md",
  "NEEDS-VALIDATION.md",
  "coverage-ledger.json",
  "recheck.json",
  "prior-findings.json",
  "run-metadata.json",
] as const;
export const SCAN_SERVABLE_FILES = SCAN_REPORT_FILES;
