import { Effect } from "effect";
import { NotFound, toExternalError, type DbError } from "#/lib/effect-query";
import type { ScanStatus } from "#/schemas";
import type { ScanRepo } from "#/modules/scan-ledger";
import type { DetailScanEnv } from "#/modules/scans/types";

// -----
// Neon says where the scan is. If the scan looks active
// but its workflow already died, the answer is failed:
// the workflow cannot write that itself.
// -----
export const detailScanSvc = (
  env: DetailScanEnv,
  repo: ScanRepo,
  accountId: string,
  scanId: string,
): Effect.Effect<ScanStatus, NotFound | DbError> =>
  Effect.gen(function* () {
    const status = yield* repo.get(accountId, scanId);
    if (!status) return yield* new NotFound({ message: "Scan not found" });
    if (status.status !== "queued" && status.status !== "running") return status;

    const instance = yield* Effect.tryPromise({
      try: () => env.SCAN_WORKFLOW.get(scanId).then((workflow) => workflow.status()),
      catch: toExternalError,
    }).pipe(Effect.orElseSucceed(() => null));
    if (instance && (instance.status === "errored" || instance.status === "terminated")) {
      return { ...status, status: "failed" as const, step: null, error: status.error ?? instance.error?.message ?? `workflow ${instance.status}` };
    }
    return status;
  });
