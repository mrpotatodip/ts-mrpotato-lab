import { SCAN_STORE_ID_TIME_LENGTH, SCAN_STORE_TIME_CEILING } from "#/modules/scan-store/constants";

export const newScanId = (): string =>
  `${(SCAN_STORE_TIME_CEILING - Date.now()).toString(36).padStart(SCAN_STORE_ID_TIME_LENGTH, "0")}-${crypto.randomUUID()}`;
