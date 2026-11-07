import { Effect } from "effect";
import { toExternalError, type ExternalError } from "#/lib/effect-query";
import type { ScanFiles } from "#/lib/scan-file-types";
import type { NewScanFile } from "#/modules/scan-ledger";
import { scanFileContentType, scanKey } from "#/modules/scan-store/utils";

// -----
// R2 holds only the bytes. The caller records each
// returned file in Neon (scan_files) so every object
// can be traced to its scan and account.
// -----
export const saveScanFilesEffect = (
  reports: R2Bucket,
  accountId: string,
  scanId: string,
  files: ScanFiles,
): Effect.Effect<NewScanFile[], ExternalError> => {
  const saved = Object.entries(files).map(([name, content]) => ({
    name,
    content,
    r2Key: scanKey(accountId, scanId, name),
    sizeBytes: new TextEncoder().encode(content).length,
    contentType: scanFileContentType(name),
  }));
  return Effect.all(
    saved.map((file) => Effect.tryPromise({ try: () => reports.put(file.r2Key, file.content), catch: toExternalError })),
    { concurrency: "unbounded" },
  ).pipe(Effect.as(saved.map(({ name, r2Key, sizeBytes, contentType }) => ({ name, r2Key, sizeBytes, contentType }))));
};

export const readScanFileEffect = (reports: R2Bucket, r2Key: string): Effect.Effect<R2ObjectBody | null, ExternalError> =>
  Effect.tryPromise({ try: () => reports.get(r2Key), catch: toExternalError });
