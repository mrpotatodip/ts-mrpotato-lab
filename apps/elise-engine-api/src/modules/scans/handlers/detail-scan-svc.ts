import { Effect } from "effect";
import { NotFound, toExternalError, type ExternalError } from "#/lib/effect-query";
import type { ScanStatus } from "#/schemas";
import { readScanStatusEffect } from "#/modules/scan-store";
import type { DetailScanEnv } from "#/modules/scans/types";

export const detailScanSvc = (
  env: DetailScanEnv,
  accountId: string,
  scanId: string,
): Effect.Effect<ScanStatus, NotFound | ExternalError> =>
  Effect.gen(function* () {
    const status = yield* readScanStatusEffect(env.REPORTS, accountId, scanId);
    if (!status) return yield* new NotFound({ message: "Scan not found" });
    if (status.status !== "queued" && status.status !== "running") return status;

    const instance = yield* Effect.tryPromise({
      try: () => env.SCAN_WORKFLOW.get(scanId).then((workflow) => workflow.status()),
      catch: toExternalError,
    }).pipe(Effect.orElseSucceed(() => null));
    if (instance && (instance.status === "errored" || instance.status === "terminated")) {
      return { ...status, status: "failed" as const, error: status.error ?? instance.error?.message ?? `workflow ${instance.status}` };
    }
    return status;
  });
