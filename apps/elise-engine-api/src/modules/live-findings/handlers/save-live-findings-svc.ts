import { Effect } from "effect";
import { LIVE_FINDINGS_PER_SCAN_MAX, LiveFindingRecordSchema, type LiveFindingRecord, type LiveFindingsSaved, type RunnerIdentity, type SaveLiveFindingsBody } from "@repo/contracts/elise";
import type { AppDbType } from "#/lib/db-connection";
import { Conflict, NotFound, toExternalError, type DbError, type ExternalError } from "#/lib/effect-query";
import { LIVE_FINDINGS_JOB_NOT_FOUND, LIVE_FINDINGS_NOT_RUNNING } from "#/modules/live-findings/constants";
import { countLiveFindingsEffect, knownFindingIdsEffect, lockScanStatusEffect, upsertLiveFindingsEffect } from "#/modules/live-findings/queries";
import { fullFindingRowOf } from "#/modules/scan-records/utils";
import { findJobRunnerEffect } from "#/modules/scan-trace/queries";

export const saveLiveFindingsSvc = (
  db: AppDbType,
  runner: RunnerIdentity,
  scanId: string,
  body: SaveLiveFindingsBody,
): Effect.Effect<LiveFindingsSaved, NotFound | Conflict | DbError | ExternalError> =>
  Effect.gen(function* () {
    const holder = yield* findJobRunnerEffect(db, runner.accountId, scanId);
    if (holder !== runner.runnerId) return yield* new NotFound({ message: LIVE_FINDINGS_JOB_NOT_FOUND });
    const status = yield* lockScanStatusEffect(db, runner.accountId, scanId);
    if (status === null) return yield* new NotFound({ message: LIVE_FINDINGS_JOB_NOT_FOUND });
    if (status !== "running") return yield* new Conflict({ message: LIVE_FINDINGS_NOT_RUNNING });

    const parsed = body.findings.flatMap((record) => {
      const result = LiveFindingRecordSchema.safeParse(record);
      return result.success ? [result.data] : [];
    });
    const records = [...new Map<string, LiveFindingRecord>(parsed.map((record) => [record.fingerprint, record])).values()];
    const rows = yield* Effect.tryPromise({
      try: () => Promise.all(records.map((record) => fullFindingRowOf(record, { accountId: runner.accountId, scanId }))),
      catch: toExternalError,
    });
    const known = yield* knownFindingIdsEffect(
      db,
      scanId,
      rows.map((row) => row.findingId),
    );
    const total = yield* countLiveFindingsEffect(db, scanId);
    const room = Math.max(0, LIVE_FINDINGS_PER_SCAN_MAX - total);
    const kept = [...rows.filter((row) => known.has(row.findingId)), ...rows.filter((row) => !known.has(row.findingId)).slice(0, room)];

    yield* upsertLiveFindingsEffect(db, kept);
    return { accepted: kept.length, dropped: body.findings.length - kept.length };
  });
