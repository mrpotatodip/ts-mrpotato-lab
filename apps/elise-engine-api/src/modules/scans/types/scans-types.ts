import type { Bindings } from "#/types/variables";

// -----
// Service inputs
// -----
export type CreateScanEnv = Pick<Bindings, "SCAN_WORKFLOW" | "SCAN_WORKFLOW_FULL" | "MODEL" | "EFFORT" | "MAX_BUDGET_USD" | "MAX_BUDGET_OWN_KEY_USD" | "MAX_ACTIVE_SCANS" | "MAX_ACTIVE_FULL_SCANS" | "MAX_GLOBAL_LITE_SCANS" | "MAX_GLOBAL_FULL_SCANS" | "MONTHLY_BUDGET_USD" | "BUDGET_ALLOWANCE_USD" | "BILLING_ENFORCED">;
export type DetailScanEnv = Pick<Bindings, "SCAN_WORKFLOW" | "SCAN_WORKFLOW_FULL">;
