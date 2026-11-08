import { Effect } from "effect";
import type { ScanUsage } from "@repo/contracts/elise";
import { dbConnect } from "#/lib/db-connection";
import type { DbError, ExternalError, ParseError } from "#/lib/effect-query";
import type { ScanParams, ScanState } from "#/schemas";
import { SCAN_RECORDS_RECORDED_SKILL } from "#/modules/scan-records/constants";
import { resolveScanBranchEffect, type ScanBranchOutcome } from "#/modules/branches";
import { readHistoryEffect, scanRowOfEffect, writeScanRecordEffect } from "#/modules/scan-records/queries";
import type { HistoryContext, RecordScanEnv } from "#/modules/scan-records/types";
import { buildScanRecordSvc } from "./build-scan-record-svc";
import { readGivenSvc } from "./read-given-svc";

const NO_HISTORY: HistoryContext = { history: new Map(), triage: new Map(), given: [] };

// -----
// Only a succeeded scan of the recorded skill that belongs to a
// tracked branch moves that branch's history, and it is judged
// against the priors saved when it launched. A scan that was already closed as
// failed (a newer request expired it) writes nothing: its
// history is stale.
// -----
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
    const db = dbConnect(env.DATABASE_URL);
    const { repoId, status: current, branch: branchName, ref } = yield* scanRowOfEffect(db, params.accountId, params.scanId);
    if (current === "failed" && status === "succeeded") {
      yield* Effect.sync(() => console.warn(`scan records: ${params.scanId} was closed as failed before it finished, so its results are not recorded`));
      return;
    }
    const recorded = status === "succeeded" && params.options.skill === SCAN_RECORDS_RECORDED_SKILL;
    const outcome: ScanBranchOutcome = recorded ? yield* resolveScanBranchEffect(db, params.accountId, repoId, { name: branchName, ref }) : { id: null, reason: null };
    const context = outcome.id
      ? { ...(yield* readHistoryEffect(db, params.accountId, repoId, outcome.id)), given: yield* readGivenSvc(env.REPORTS, params) }
      : NO_HISTORY;
    const record = yield* buildScanRecordSvc(env.REPORTS, params, repoId, { ...outcome, name: outcome.name ?? branchName }, status, error, usage, context);
    yield* writeScanRecordEffect(db, record);
  });
