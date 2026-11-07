import type { SCAN_REPORT_FILES } from "#/constants";

export type ScanFiles = Partial<Record<(typeof SCAN_REPORT_FILES)[number], string>>;
