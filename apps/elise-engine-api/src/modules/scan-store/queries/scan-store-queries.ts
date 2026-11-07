import { Effect } from "effect";
import { SCAN_STATUS_FILE } from "#/constants";
import { toExternalError, type ExternalError } from "#/lib/effect-query";
import type { ScanFiles } from "#/lib/scan-file-types";
import { ScanStatusSchema, type ScanParams, type ScanState, type ScanStatus } from "#/schemas";
import type { ScanStatusExtra, ScanStatusPage } from "#/modules/scan-store/types";
import { scanKey, scanPrefix } from "#/modules/scan-store/utils";

export const writeScanStatusEffect = (
  reports: R2Bucket,
  params: ScanParams,
  status: ScanState,
  extra: ScanStatusExtra = {},
): Effect.Effect<void, ExternalError> => {
  const now = new Date().toISOString();
  const body: ScanStatus = {
    scanId: params.scanId,
    accountId: params.accountId,
    repo: params.repo,
    ...params.options,
    status,
    createdAt: params.createdAt,
    updatedAt: now,
    finishedAt: status === "succeeded" || status === "failed" ? now : null,
    error: extra.error ?? null,
    files: extra.files ?? null,
  };
  return Effect.tryPromise({
    try: () => reports.put(scanKey(params.accountId, params.scanId, SCAN_STATUS_FILE), JSON.stringify(body)),
    catch: toExternalError,
  }).pipe(Effect.asVoid);
};

export const readScanStatusEffect = (
  reports: R2Bucket,
  accountId: string,
  scanId: string,
): Effect.Effect<ScanStatus | null, ExternalError> =>
  Effect.gen(function* () {
    const object = yield* Effect.tryPromise({
      try: () => reports.get(scanKey(accountId, scanId, SCAN_STATUS_FILE)),
      catch: toExternalError,
    });
    if (!object) return null;
    const raw = yield* Effect.tryPromise({ try: () => object.json(), catch: toExternalError });
    return yield* Effect.try(() => ScanStatusSchema.parse(raw)).pipe(Effect.orDie);
  });

export const listScanStatusesEffect = (
  reports: R2Bucket,
  accountId: string,
  limit: number,
  cursor?: string,
): Effect.Effect<ScanStatusPage, ExternalError> =>
  Effect.gen(function* () {
    const prefix = scanPrefix(accountId);
    const listed = yield* Effect.tryPromise({
      try: () => reports.list({ prefix, delimiter: "/", limit, cursor }),
      catch: toExternalError,
    });
    const found = yield* Effect.all(
      listed.delimitedPrefixes.map((entry) => readScanStatusEffect(reports, accountId, entry.slice(prefix.length, -1))),
      { concurrency: "unbounded" },
    );
    return { scans: found.filter((scan) => scan !== null), nextCursor: listed.truncated ? listed.cursor : null };
  });

export const saveScanFilesEffect = (
  reports: R2Bucket,
  accountId: string,
  scanId: string,
  files: ScanFiles,
): Effect.Effect<string[], ExternalError> => {
  const entries = Object.entries(files);
  return Effect.all(
    entries.map(([name, content]) =>
      Effect.tryPromise({ try: () => reports.put(scanKey(accountId, scanId, name), content), catch: toExternalError }),
    ),
    { concurrency: "unbounded" },
  ).pipe(Effect.as(entries.map(([name]) => name)));
};

export const readScanFileEffect = (
  reports: R2Bucket,
  accountId: string,
  scanId: string,
  file: string,
): Effect.Effect<R2ObjectBody | null, ExternalError> =>
  Effect.tryPromise({ try: () => reports.get(scanKey(accountId, scanId, file)), catch: toExternalError });
