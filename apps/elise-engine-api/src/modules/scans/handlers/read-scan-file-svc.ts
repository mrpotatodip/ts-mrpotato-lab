import { Effect } from "effect";
import { NotFound, type DbError, type ExternalError } from "#/lib/effect-query";
import type { ScanRepo } from "#/modules/scan-ledger";
import { readScanFileEffect } from "#/modules/scan-store";

// -----
// Neon decides whether the file exists for this
// account; R2 only supplies the bytes.
// -----
export const readScanFileSvc = (
  reports: R2Bucket,
  repo: ScanRepo,
  accountId: string,
  scanId: string,
  file: string,
): Effect.Effect<{ body: R2ObjectBody; contentType: string }, NotFound | DbError | ExternalError> =>
  Effect.gen(function* () {
    const ref = yield* repo.file(accountId, scanId, file);
    if (!ref) return yield* new NotFound({ message: "File not found" });
    const body = yield* readScanFileEffect(reports, ref.r2Key);
    if (!body) return yield* new NotFound({ message: "File not found" });
    return { body, contentType: ref.contentType };
  });
