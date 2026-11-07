import type { ScanStatus } from "#/schemas";

// -----
// Status files
// -----
export type ScanStatusExtra = { error?: string; files?: string[] };
export type ScanStatusPage = { scans: ScanStatus[]; nextCursor: string | null };
