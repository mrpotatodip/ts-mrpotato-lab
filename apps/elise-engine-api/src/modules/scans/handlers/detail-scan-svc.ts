import { Effect } from "effect";
import { NotFound, toExternalError, type DbError } from "#/lib/effect-query";
import { otherPathOf, scanPathOf, workflowOf } from "#/lib/scan-path";
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

    // -----
    // Asked on the path of the scan's Skill. A scan that started before
    // the two paths existed is on the original Workflow whatever its
    // Skill, so a miss is asked again there.
    // -----
    const statusOn = (path: ReturnType<typeof scanPathOf>) =>
      Effect.tryPromise({ try: () => workflowOf(env, path).get(scanId).then((workflow) => workflow.status()), catch: toExternalError });
    const path = scanPathOf(status.skill);
    const instance = yield* statusOn(path).pipe(
      Effect.orElse(() => statusOn(otherPathOf(path))),
      Effect.orElseSucceed(() => null),
    );
    if (instance && (instance.status === "errored" || instance.status === "terminated")) {
      return { ...status, status: "failed" as const, step: null, error: status.error ?? instance.error?.message ?? `workflow ${instance.status}` };
    }
    return status;
  });
