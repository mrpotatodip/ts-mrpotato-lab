import type { scanFindings, scans } from "@repo/db-elise/schema";
import type { Bindings } from "#/types/variables";

// -----
// Rows to write
// -----
export type NewScanRow = typeof scans.$inferInsert;
export type NewFindingRow = typeof scanFindings.$inferInsert;
export type ScanRecord = { scan: NewScanRow; findings: NewFindingRow[] };

// -----
// Service inputs
// -----
export type RecordScanEnv = Pick<Bindings, "REPORTS" | "DATABASE_URL">;
