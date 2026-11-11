// -----
// Reading findings.json
// -----
export const SCAN_RECORDS_FINDINGS_FILE = "findings.json";
export const SCAN_RECORDS_RECORDED_SKILL = "lite";
export const SCAN_RECORDS_RECHECK_FILE = "recheck.json";
export const SCAN_RECORDS_PRIOR_FILE = "prior-findings.json";

// -----
// History: the most prior findings one scan re-checks.
// Each costs the agent tokens, so the worst come first.
// -----
export const SCAN_RECORDS_PRIOR_LIMIT = 50;
