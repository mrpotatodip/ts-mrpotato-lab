import type { ScanStatus } from "#/schemas";
import { SCANS_ACTIVE_WINDOW_MS } from "#/modules/scans/constants";

export const isActiveScan = (scan: ScanStatus, now: number): boolean =>
  (scan.status === "queued" || scan.status === "running") && now - Date.parse(scan.updatedAt) < SCANS_ACTIVE_WINDOW_MS;
