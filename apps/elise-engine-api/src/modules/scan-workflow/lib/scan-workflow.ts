import { WorkflowEntrypoint, type WorkflowEvent, type WorkflowStep } from "cloudflare:workers";
import { ScanUsageSchema, type ScanUsage } from "@repo/contracts/elise";
import type { ScanParams, ScanState } from "#/schemas";
import { runEffect } from "#/lib/effect-query";
import { recordScanSvc } from "#/modules/scan-records";
import { dbConnect } from "#/lib/db-connection";
import { neonScanRepo, type ScanPatch } from "#/modules/scan-ledger";
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
import type { Bindings } from "#/types/variables";

type PollResult = { state: "running" | "succeeded" | "failed"; error?: string };

export class ScanWorkflow extends WorkflowEntrypoint<Bindings, ScanParams> {
  async run(event: WorkflowEvent<ScanParams>, step: WorkflowStep) {
    const params = event.payload;
    const sandbox = this.env.SANDBOX.getByName(params.scanId);
    const repo = neonScanRepo(dbConnect(this.env.DATABASE_URL));
    const mark = (name: string, patch: ScanPatch) =>
      step.do(name, async () => {
        await runEffect(repo.mark(params.accountId, params.scanId, patch));
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
      await mark("status-running", { status: "running", step: "cloning" });
      await step.do("prepare", { retries: SCAN_WORKFLOW_RETRY_ONCE, timeout: SCAN_WORKFLOW_PREPARE_TIMEOUT }, async () => {
        await sandbox.prepare(params.repo);
        return true;
      });
      await step.do("launch-agent", { retries: SCAN_WORKFLOW_RETRY_ONCE, timeout: SCAN_WORKFLOW_LAUNCH_TIMEOUT }, async () => {
        await runEffect(repo.mark(params.accountId, params.scanId, { step: "auditing" }));
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

      await step.do("save-files", async () => {
        await runEffect(repo.mark(params.accountId, params.scanId, { step: "saving" }));
        const saved = await runEffect(saveScanFilesEffect(this.env.REPORTS, params.accountId, params.scanId, await sandbox.readFiles()));
        await runEffect(repo.addFiles(params.accountId, params.scanId, saved));
        return saved.map((file) => file.name);
      });
      await mark("status-succeeded", { status: "succeeded", error: null, usage });
      await record("succeeded", null, usage);
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
  }
}
