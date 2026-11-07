import type { Bindings } from "#/types/variables";

// -----
// Service inputs
// -----
export type CreateScanEnv = Pick<Bindings, "REPORTS" | "SCAN_WORKFLOW" | "MODEL" | "EFFORT" | "MAX_BUDGET_USD" | "MAX_ACTIVE_SCANS" | "MONTHLY_BUDGET_USD">;
export type DetailScanEnv = Pick<Bindings, "REPORTS" | "SCAN_WORKFLOW">;
