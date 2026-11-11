import { z } from "zod";
import { RUNNER_JOB_QUEUE_TIMEOUT_MS, ScanUsageSchema } from "@repo/contracts/elise";
import { SCAN_REPORT_FILES } from "#/constants";
import type { DbConnectType } from "#/lib/db-connection";
import { runEffect } from "#/lib/effect-query";
import type { ScanFiles } from "#/lib/scan-file-types";
import type { ScanParams } from "#/schemas";
import { RUNNER_JOB_NO_REPORT, RUNNER_JOB_NOT_PICKED_UP, RUNNER_JOB_PRIVATE, RUNNER_PROMPT_PLACE } from "#/modules/runners/constants";
import { cancelRunnerJobEffect, insertRunnerJobEffect, readRunnerJobEffect } from "#/modules/runners/queries";
import { buildAgentPrompt } from "#/modules/scan-sandbox/utils";
import type { SandboxPort } from "#/modules/scan-workflow/types";

const FilesSchema = z.record(z.string(), z.string());

// -----
// A Runner as the Workflow's sandbox. The Workflow runs the same
// steps as for the container, and this answers them from the job
// row: launching queues the job, polling reads its state, and the
// files, usage and commit are what the Runner reported. Nothing is
// cloned or run here: the Runner does that on its own computer.
// -----
export const runnerSandbox = (db: DbConnectType, params: ScanParams, runnerId: string, now: () => Date = () => new Date()): SandboxPort => {
  const read = () => runEffect(readRunnerJobEffect(db, params.scanId));
  return {
    // -----
    // A private repo needs a token that only the container's
    // outbound proxy makes, so it cannot run on a Runner yet.
    // -----
    prepare: async () => {
      if (params.github) throw new Error(RUNNER_JOB_PRIVATE);
      return { commitSha: null, branch: null };
    },

    launchAgent: async (options, priors) => {
      await runEffect(
        insertRunnerJobEffect(db, {
          scanId: params.scanId,
          tenantId: params.accountId,
          runnerId,
          repoUrl: params.repo,
          ref: params.ref ?? null,
          prompt: buildAgentPrompt(options, priors.length, RUNNER_PROMPT_PLACE),
          optionsJson: JSON.stringify(options),
          priorsJson: priors.length > 0 ? JSON.stringify(priors, null, 2) : "",
        }),
      );
    },

    pollAgent: async () => {
      const job = await read();
      if (job === null) return { state: "failed", error: "the runner job is missing" };
      if (job.state === "succeeded") return { state: "succeeded" };
      if (job.state === "failed") return { state: "failed", error: job.error ?? "the runner reported a failure" };
      if (job.state === "cancelled") return { state: "failed", error: "the scan ended before the runner reported" };
      const waited = now().getTime() - job.createdAt.getTime();
      if (job.state === "queued" && waited > RUNNER_JOB_QUEUE_TIMEOUT_MS) return { state: "failed", error: RUNNER_JOB_NOT_PICKED_UP };
      return { state: "running" };
    },

    agentLogTail: async () => (await read())?.error ?? "(no runner log)",

    readUsage: async () => {
      const job = await read();
      return job?.usageJson ? ScanUsageSchema.parse(JSON.parse(job.usageJson)) : null;
    },

    readFiles: async () => {
      const job = await read();
      const sent = job?.filesJson ? FilesSchema.parse(JSON.parse(job.filesJson)) : {};
      const files: ScanFiles = {};
      for (const name of SCAN_REPORT_FILES) {
        const text = sent[name];
        if (text !== undefined) files[name] = text;
      }
      if (files["REPORT.md"] === undefined) throw new Error(RUNNER_JOB_NO_REPORT);
      return files;
    },

    readCheckout: async () => {
      const job = await read();
      return job === null ? null : { commitSha: job.commitSha, branch: job.branch };
    },

    destroy: async () => {
      await runEffect(cancelRunnerJobEffect(db, params.scanId, now()));
    },
  };
};
