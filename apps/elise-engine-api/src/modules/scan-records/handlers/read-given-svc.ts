import { Effect } from "effect";
import { toExternalError, toParseError, type ExternalError } from "#/lib/effect-query";
import type { ScanParams } from "#/schemas";
import { readScanFileEffect, scanKey } from "#/modules/scan-store";
import { SCAN_RECORDS_PRIOR_FILE } from "#/modules/scan-records/constants";
import { PriorFindingsSchema } from "#/modules/scan-records/schemas";
import type { PriorFinding } from "#/modules/scan-records/types";

// -----
// The priors this scan's agent was given. None saved means
// none were given. A saved file that cannot be read fails
// the record, so a retry can read it, instead of judging
// the answer against an empty list.
// -----
export const readGivenSvc = (reports: R2Bucket, params: ScanParams): Effect.Effect<PriorFinding[], ExternalError> =>
  Effect.gen(function* () {
    const object = yield* readScanFileEffect(reports, scanKey(params.accountId, params.scanId, SCAN_RECORDS_PRIOR_FILE));
    if (!object) return [];
    const text = yield* Effect.tryPromise({ try: () => object.text(), catch: toExternalError });
    return yield* Effect.try({ try: () => PriorFindingsSchema.parse(JSON.parse(text)), catch: toParseError }).pipe(
      Effect.mapError(toExternalError),
    );
  });
