import { WorkflowEntrypoint, type WorkflowEvent, type WorkflowStep } from "cloudflare:workers";
import { ScanUsageSchema, type ScanUsage } from "@repo/contracts/elise";
import type { ScanParams, ScanState } from "#/schemas";
import { runEffect } from "#/lib/effect-query";
import { recordScanSvc } from "#/modules/scan-records";
import { saveScanFilesEffect, writeScanStatusEffect, type ScanStatusExtra } from "#/modules/scan-store";
import {
  SCAN_WORKFLOW_LAUNCH_TIMEOUT,
  SCAN_WORKFLOW_MAX_POLLS,
  SCAN_WORKFLOW_POLL_SECONDS,
  SCAN_WORKFLOW_PREPARE_TIMEOUT,
  SCAN_WORKFLOW_RECORD_RETRY,
  SCAN_WORKFLOW_RECORD_TIMEOUT,
  SCAN_WORKFLOW_RETRY_ONCE,
} from "#/modules/scan-workflow/constants";
import type { Bindings } from "#/types/variables";

type PollResult = { state: "running" | "succeeded" | "failed"; error?: string };

export class ScanWorkflow extends WorkflowEntrypoint<Bindings, ScanParams> {
  async run(event: WorkflowEvent<ScanParams>, step: WorkflowStep) {
    const params = event.payload;
    const sandbox = this.env.SANDBOX.getByName(params.scanId);
    const setStatus = (name: string, status: ScanState, extra: ScanStatusExtra = {}) =>
      step.do(name, async () => {
        await runEffect(writeScanStatusEffect(this.env.REPORTS, params, status, extra));
        return true;
      });

    const record = async (status: ScanState, error: string | null, usage: ScanUsage | null) => {
      try {
        await step.do(
          `record-scan-${status}`,
          { retries: SCAN_WORKFLOW_RECORD_RETRY, timeout: SCAN_WORKFLOW_RECORD_TIMEOUT },
          async () => {
            await runEffect(recordScanSvc(this.env, params, status, error, usage));
            return true;
          },
        );
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
      await setStatus("status-running", "running");
      await step.do("prepare", { retries: SCAN_WORKFLOW_RETRY_ONCE, timeout: SCAN_WORKFLOW_PREPARE_TIMEOUT }, async () => {
        await sandbox.prepare(params.repo);
        return true;
      });
      await step.do("launch-agent", { retries: SCAN_WORKFLOW_RETRY_ONCE, timeout: SCAN_WORKFLOW_LAUNCH_TIMEOUT }, async () => {
        await sandbox.launchAgent(params.options);
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

      const files = await step.do("save-files", async () =>
        runEffect(saveScanFilesEffect(this.env.REPORTS, params.accountId, params.scanId, await sandbox.readFiles())),
      );
      await setStatus("status-succeeded", "succeeded", { files, usage });
      await record("succeeded", null, usage);
      return { ok: true };
    } catch (cause) {
      const error = cause instanceof Error ? cause.message : String(cause);
      try {
        await setStatus("status-failed", "failed", { error, usage });
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
  }
}
