// -----
// Scan options
// -----
export const SCAN_MODELS = ["claude-sonnet-5-5", "claude-opus-5-5", "claude-haiku-5-5"] as const;
export const SCAN_EFFORTS = ["low", "medium", "high", "xhigh", "max"] as const;
export const SCAN_SKILLS = ["lite", "full"] as const;
export const SCAN_PROFILES = ["quick", "standard", "deep"] as const;
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
  "run-metadata.json",
] as const;
export const SCAN_STATUS_FILE = "status.json";
export const SCAN_SERVABLE_FILES = [...SCAN_REPORT_FILES, SCAN_STATUS_FILE] as const;
