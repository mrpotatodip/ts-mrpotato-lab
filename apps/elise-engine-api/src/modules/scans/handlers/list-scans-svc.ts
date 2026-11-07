import type { Effect } from "effect";
import type { ExternalError } from "#/lib/effect-query";
import { listScanStatusesEffect, type ScanStatusPage } from "#/modules/scan-store";
import { SCANS_PAGE_SIZE } from "#/modules/scans/constants";

export const listScansSvc = (
  reports: R2Bucket,
  accountId: string,
  cursor?: string,
): Effect.Effect<ScanStatusPage, ExternalError> => listScanStatusesEffect(reports, accountId, SCANS_PAGE_SIZE, cursor);
