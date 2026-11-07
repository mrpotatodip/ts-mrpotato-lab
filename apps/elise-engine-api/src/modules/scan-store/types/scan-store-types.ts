import type { ScanUsage } from "@repo/contracts/elise";
import type { ScanStatus } from "#/schemas";

// -----
// Status files
// -----
export type ScanStatusExtra = { error?: string; files?: string[]; usage?: ScanUsage | null };
export type ScanStatusPage = { scans: ScanStatus[]; nextCursor: string | null };
