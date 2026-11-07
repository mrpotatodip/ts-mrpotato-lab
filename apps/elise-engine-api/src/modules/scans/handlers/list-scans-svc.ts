import type { Effect } from "effect";
import type { DbError } from "#/lib/effect-query";
import type { ScanPage, ScanRepo } from "#/modules/scan-ledger";
import { SCANS_PAGE_SIZE } from "#/modules/scans/constants";

export const listScansSvc = (repo: ScanRepo, accountId: string, cursor?: string): Effect.Effect<ScanPage, DbError> =>
  repo.list(accountId, SCANS_PAGE_SIZE, cursor);
