import { Effect } from "effect";
import { NotFound, type ExternalError } from "#/lib/effect-query";
import { readScanFileEffect } from "#/modules/scan-store";

export const readScanFileSvc = (
  reports: R2Bucket,
  accountId: string,
  scanId: string,
  file: string,
): Effect.Effect<R2ObjectBody, NotFound | ExternalError> =>
  Effect.gen(function* () {
    const object = yield* readScanFileEffect(reports, accountId, scanId, file);
    if (!object) return yield* new NotFound({ message: "File not found" });
    return object;
  });
