// -----
// Polling
// -----
export const SCAN_WORKFLOW_POLL_SECONDS = 10;
export const SCAN_WORKFLOW_MAX_POLLS = 240;

// -----
// The full worker's time limits. The whole audit may take 90 minutes
// (lite keeps 40 above). Each Phase has a slot of its own, so a slow
// Phase cannot use the time of the Phases after it; the slots add up to
// the total. Provisional until a measurement of real full Scans.
// -----
export const SCAN_WORKFLOW_FULL_MAX_POLLS = 540;
export const SCAN_WORKFLOW_FULL_PHASE_MINUTES = { recon: 10, hunt: 45, check: 25, report: 10 } as const;

// -----
// Steps
// -----
export const SCAN_WORKFLOW_RECORD_RETRY = { limit: 3, delay: "5 seconds", backoff: "exponential" } as const;
export const SCAN_WORKFLOW_RECORD_TIMEOUT = "2 minutes";
export const SCAN_WORKFLOW_RETRY_ONCE = { limit: 1, delay: "10 seconds" } as const;
export const SCAN_WORKFLOW_PREPARE_TIMEOUT = "10 minutes";
export const SCAN_WORKFLOW_LAUNCH_TIMEOUT = "5 minutes";
