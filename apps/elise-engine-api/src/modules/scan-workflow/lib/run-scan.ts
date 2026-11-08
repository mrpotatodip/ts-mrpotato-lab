import type { WorkflowStep } from "cloudflare:workers";
import { ScanUsageSchema, type ScanUsage } from "@repo/contracts/elise";
import { runEffect } from "#/lib/effect-query";
import type { ScanParams, ScanState } from "#/schemas";
import type { ScanPatch } from "#/modules/scan-ledger";
import { saveScanFilesEffect } from "#/modules/scan-store";
import {
  SCAN_WORKFLOW_LAUNCH_TIMEOUT,
  SCAN_WORKFLOW_MAX_POLLS,
  SCAN_WORKFLOW_POLL_SECONDS,
  SCAN_WORKFLOW_PREPARE_TIMEOUT,
  SCAN_WORKFLOW_RECORD_RETRY,
  SCAN_WORKFLOW_RECORD_TIMEOUT,
  SCAN_WORKFLOW_RETRY_ONCE,
} from "#/modules/scan-workflow/constants";
import type { PollResult, ScanRunDeps } from "#/modules/scan-workflow/types";

// -----
// One scan from queued to a final state. The Workflow class
// builds the real dependencies and calls this; a test passes
// fakes and a step that runs each callback inline.
// -----
export const runScan = async (deps: ScanRunDeps, params: ScanParams, step: WorkflowStep): Promise<{ ok: true }> => {
  const { sandbox, ledger, reports } = deps;
  const mark = (name: string, patch: ScanPatch) =>
    step.do(name, async () => {
      await runEffect(ledger.mark(params.accountId, params.scanId, patch));
      return true;
    });

  const recordStep = (status: ScanState, error: string | null, usage: ScanUsage | null) =>
    step.do(`record-scan-${status}`, { retries: SCAN_WORKFLOW_RECORD_RETRY, timeout: SCAN_WORKFLOW_RECORD_TIMEOUT }, async () => {
      await deps.recordScan(params, status, error, usage);
      return true;
    });

  const record = async (status: ScanState, error: string | null, usage: ScanUsage | null) => {
    try {
      await recordStep(status, error, usage);
    } catch (cause) {
      console.error("scan: could not record the scan in the database", cause instanceof Error ? cause.message : cause);
    }
  };

  let usage: ScanUsage | null = null;
  const readUsage = async () => {
    try {
      usage = await step.do("read-usage", async () => ScanUsageSchema.nullable().parse(await sandbox.readUsage()));
    } catch {
      console.error("scan: could not read the usage");
    }
  };

  try {
    await mark("status-running", { status: "running", step: "cloning" });
    await step.do("prepare", { retries: SCAN_WORKFLOW_RETRY_ONCE, timeout: SCAN_WORKFLOW_PREPARE_TIMEOUT }, async () => {
      const checkout = await sandbox.prepare(params.repo, params.ref);
      await runEffect(ledger.mark(params.accountId, params.scanId, checkout));
      return checkout;
    });
    // -----
    // Its own step, so a retry of the launch gives the agent
    // the same list. The list is saved with the scan: recording
    // judges the answer against what was asked.
    // -----
    const priors = await step.do("read-priors", async () => {
      const found = await deps.readPriors(params);
      if (found.length === 0) return found;
      const saved = await runEffect(saveScanFilesEffect(reports, params.accountId, params.scanId, { "prior-findings.json": JSON.stringify(found) }));
      await runEffect(ledger.addFiles(params.accountId, params.scanId, saved));
      return found;
    });
    await step.do("launch-agent", { retries: SCAN_WORKFLOW_RETRY_ONCE, timeout: SCAN_WORKFLOW_LAUNCH_TIMEOUT }, async () => {
      await runEffect(ledger.mark(params.accountId, params.scanId, { step: "auditing" }));
      await sandbox.launchAgent(params.options, priors);
      return true;
    });

    let outcome: PollResult = { state: "running" };
    for (let i = 0; i < SCAN_WORKFLOW_MAX_POLLS && outcome.state === "running"; i++) {
      await step.sleep(`wait-${i}`, `${SCAN_WORKFLOW_POLL_SECONDS} seconds`);
      outcome = await step.do(`poll-${i}`, async () => {
        const polled = await sandbox.pollAgent();
        return polled.state === "failed" ? { state: "failed" as const, error: polled.error } : { state: polled.state };
      });
    }
    await readUsage();
    if (outcome.state === "running") {
      const tail = await step.do("log-tail", () => sandbox.agentLogTail());
      throw new Error(`the agent timed out after ${(SCAN_WORKFLOW_MAX_POLLS * SCAN_WORKFLOW_POLL_SECONDS) / 60} minutes: ${tail}`);
    }
    if (outcome.state === "failed") throw new Error(outcome.error ?? "the agent failed");

    await step.do("save-files", async () => {
      await runEffect(ledger.mark(params.accountId, params.scanId, { step: "saving" }));
      const saved = await runEffect(saveScanFilesEffect(reports, params.accountId, params.scanId, await sandbox.readFiles()));
      await runEffect(ledger.addFiles(params.accountId, params.scanId, saved));
      return saved.map((file) => file.name);
    });
    // -----
    // Record first: the scan stays running, and its repo stays
    // blocked, until its findings and the History are saved. A
    // scan whose results cannot be recorded is a failed scan.
    // -----
    try {
      await recordStep("succeeded", null, usage);
    } catch (cause) {
      throw new Error(`the results were saved but could not be recorded: ${cause instanceof Error ? cause.message : String(cause)}`, { cause });
    }
    await mark("status-succeeded", { status: "succeeded", error: null, usage });
    return { ok: true };
  } catch (cause) {
    const error = cause instanceof Error ? cause.message : String(cause);
    try {
      await mark("status-failed", { status: "failed", error, usage });
    } catch {
      console.error("scan: could not write the failed status");
    }
    await record("failed", error, usage);
    throw cause;
  } finally {
    await step.do("cleanup", async () => {
      await sandbox.destroy();
      return true;
    });
  }
};
