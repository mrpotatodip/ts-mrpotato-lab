// -----
// Polling
// -----
export const SCAN_WORKFLOW_POLL_SECONDS = 10;
export const SCAN_WORKFLOW_MAX_POLLS = 240;

// -----
// Steps
// -----
export const SCAN_WORKFLOW_RECORD_RETRY = { limit: 3, delay: "5 seconds", backoff: "exponential" } as const;
export const SCAN_WORKFLOW_RECORD_TIMEOUT = "2 minutes";
export const SCAN_WORKFLOW_RETRY_ONCE = { limit: 1, delay: "10 seconds" } as const;
export const SCAN_WORKFLOW_PREPARE_TIMEOUT = "10 minutes";
export const SCAN_WORKFLOW_LAUNCH_TIMEOUT = "5 minutes";
