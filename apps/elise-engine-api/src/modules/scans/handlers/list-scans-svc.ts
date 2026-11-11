import type { Effect } from "effect";
import type { DbError } from "#/lib/effect-query";
import type { ScanListQuery } from "@repo/contracts/elise";
import type { ScanPage, ScanRepo } from "#/modules/scan-ledger";

export const listScansSvc = (repo: ScanRepo, accountId: string, query: ScanListQuery): Effect.Effect<ScanPage, DbError> =>
  repo.list(accountId, query.limit, query.cursor, { repoId: query.repoId, status: query.status });
