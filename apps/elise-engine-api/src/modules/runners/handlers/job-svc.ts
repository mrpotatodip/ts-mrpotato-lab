import { Effect } from "effect";
import type { RunnerJob, RunnerJobResultBody } from "@repo/contracts/elise";
import { SCAN_REPORT_FILES } from "#/constants";
import type { DbConnectType } from "#/lib/db-connection";
import { NotFound, type DbError } from "#/lib/effect-query";
import type { ScanFiles } from "#/lib/scan-file-types";
import { ScanOptionsSchema } from "#/schemas";
import { normalizeBranchName } from "#/modules/branches";
import { parseAgentUsage } from "#/modules/scan-sandbox/utils";
import { RUNNER_JOB_BAD_OPTIONS, RUNNER_JOB_NO_REPORT, RUNNER_JOB_NOT_FOUND } from "#/modules/runners/constants";
import { claimRunnerJobEffect, readRunnerJobEffect, reportRunnerJobEffect } from "#/modules/runners/queries";

// -----
// The Runner takes the next Scan waiting for it, or gets null.
// Asking also records that the Runner is alive, through the
// authentication that comes before this.
// A job whose options no longer parse is failed on the spot, so
// the Scan ends with a reason and the Runner moves to the next
// job instead of meeting the same row on every poll.
// -----
export const claimJobSvc = (db: DbConnectType, runnerId: string): Effect.Effect<RunnerJob | null, DbError> =>
  Effect.gen(function* () {
    const now = new Date();
    const row = yield* claimRunnerJobEffect(db, runnerId, now);
    if (row === null) return null;
    const options = yield* Effect.try(() => ScanOptionsSchema.parse(JSON.parse(row.optionsJson))).pipe(Effect.option);
    if (options._tag === "None") {
      yield* reportRunnerJobEffect(db, {
        scanId: row.scanId,
        runnerId,
        state: "failed",
        error: RUNNER_JOB_BAD_OPTIONS,
        commitSha: null,
        branch: null,
        usageJson: null,
        filesJson: "{}",
        now,
      });
      return yield* claimJobSvc(db, runnerId);
    }
    return {
      scanId: row.scanId,
      repo: row.repoUrl,
      ref: row.ref,
      skill: options.value.skill,
      model: options.value.model,
      effort: options.value.effort,
      maxBudgetUsd: options.value.maxBudgetUsd,
      prompt: row.prompt,
      priorsJson: row.priorsJson,
    };
  });

// -----
// Only the names a Scan may keep, and not the earlier findings,
// which the Workflow saved itself.
// -----
const keptFiles = (sent: RunnerJobResultBody["files"]): ScanFiles => {
  const kept: ScanFiles = {};
  for (const name of SCAN_REPORT_FILES) {
    const text = sent?.[name];
    if (text !== undefined && name !== "prior-findings.json") kept[name] = text;
  }
  return kept;
};

// -----
// The branch the same way the container works it out: with a ref,
// the ref when git fetched it as a branch; without one, the branch
// HEAD was on.
// -----
const branchOf = (ref: string | null, checkout: RunnerJobResultBody["checkout"]): string | null => {
  if (ref) return checkout?.kind === "branch" ? ref : null;
  return normalizeBranchName(checkout?.headBranch ?? "");
};

// -----
// A succeeded report with no REPORT.md is a failure, as in the
// container. The cost is the agent's own estimate at API prices,
// kept so the person can see what the scan would have cost. It
// carries no markup and is never billed: a Scan on a Runner runs
// on the person's own Claude, takes no credit hold, settles
// nothing, and the month's spend leaves it out.
// -----
export const reportJobSvc = (db: DbConnectType, runnerId: string, scanId: string, body: RunnerJobResultBody): Effect.Effect<{ accepted: true }, NotFound | DbError> =>
  Effect.gen(function* () {
    const job = yield* readRunnerJobEffect(db, scanId);
    if (job === null || job.runnerId !== runnerId) return yield* Effect.fail(new NotFound({ message: RUNNER_JOB_NOT_FOUND }));

    const files = keptFiles(body.files);
    const succeeded = body.state === "succeeded" && files["REPORT.md"] !== undefined;
    const usage = body.agentLog ? parseAgentUsage(body.agentLog) : null;
    const accepted = yield* reportRunnerJobEffect(db, {
      scanId,
      runnerId,
      state: succeeded ? "succeeded" : "failed",
      error: succeeded ? null : (body.error ?? RUNNER_JOB_NO_REPORT),
      commitSha: body.checkout?.commitSha ?? null,
      branch: branchOf(job.ref, body.checkout),
      usageJson: usage === null ? null : JSON.stringify(usage),
      filesJson: succeeded ? JSON.stringify(files) : null,
      now: new Date(),
    });
    if (!accepted) return yield* Effect.fail(new NotFound({ message: RUNNER_JOB_NOT_FOUND }));
    return { accepted: true as const };
  });
