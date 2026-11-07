import { Effect } from "effect";
import type { ScanUsage } from "@repo/contracts/elise";
import { dbConnect } from "#/lib/db-connection";
import type { DbError, ExternalError, ParseError } from "#/lib/effect-query";
import type { ScanParams, ScanState } from "#/schemas";
import { writeScanRecordEffect } from "#/modules/scan-records/queries";
import type { RecordScanEnv } from "#/modules/scan-records/types";
import { buildScanRecordSvc } from "./build-scan-record-svc";

export const recordScanSvc = (
  env: RecordScanEnv,
  params: ScanParams,
  status: ScanState,
  error: string | null,
  usage: ScanUsage | null,
): Effect.Effect<void, DbError | ExternalError | ParseError> =>
  Effect.gen(function* () {
    if (!env.DATABASE_URL) {
      yield* Effect.sync(() => console.warn("scan records: DATABASE_URL is not set, so the scan is not recorded"));
      return;
    }
    const record = yield* buildScanRecordSvc(env.REPORTS, params, status, error, usage);
    yield* writeScanRecordEffect(dbConnect(env.DATABASE_URL), record);
  });
