import { Files } from "@cloudflare/sandbox";
import { DurableObject } from "cloudflare:workers";
import type { ScanUsage } from "@repo/contracts/elise";
import { SCAN_REPORT_FILES } from "#/constants";
import type { ScanFiles } from "#/lib/scan-file-types";
import type { ScanOptions } from "#/schemas";
import type { PriorFinding } from "#/modules/scan-records";
import type { Bindings } from "#/types/variables";
import { normalizeBranchName } from "#/modules/branches";
import {
  SCAN_SANDBOX_AGENT_ENV,
  SCAN_SANDBOX_AGENT_ERR,
  SCAN_SANDBOX_AGENT_EXIT,
  SCAN_SANDBOX_AGENT_LOG,
  SCAN_SANDBOX_BRANCH_FILE,
  SCAN_SANDBOX_CLONE_GUARD_MS,
  SCAN_SANDBOX_CLONED_MARKER,
  SCAN_SANDBOX_COMMIT_FILE,
  SCAN_SANDBOX_INACTIVITY_MS,
  SCAN_SANDBOX_INSTANCE_TYPE,
  SCAN_SANDBOX_KIND_FILE,
  SCAN_SANDBOX_LOG_TAIL_CHARS,
  SCAN_SANDBOX_METER_KEY,
  SCAN_SANDBOX_OUT_DIR,
  SCAN_SANDBOX_PRIOR_PATH,
  SCAN_SANDBOX_PROMPT_PATH,
  SCAN_SANDBOX_REPO_DIR,
  SCAN_SANDBOX_TRUST_ENV,
  SCAN_SANDBOX_WORK_DIR,
} from "#/modules/scan-sandbox/constants";
import type { AgentState, Meter, MeteredTokens, OutboundExport, OutboundGithub, ScanCheckout } from "#/modules/scan-sandbox/types";
import { buildAgentPrompt, buildAgentScript, buildCloneScript, parseAgentUsage, priceUsage } from "#/modules/scan-sandbox/utils";

type SandboxContext = DurableObjectState & { exports: { Outbound: OutboundExport } };

export class ScanSandbox extends DurableObject<Bindings> {
  readonly #container: NonNullable<DurableObjectState["container"]>;
  readonly #files: Files;
  readonly #context: SandboxContext;

  constructor(ctx: SandboxContext, env: Bindings) {
    super(ctx, env);
    if (!ctx.container) throw new Error("The container binding is not configured");
    this.#container = ctx.container;
    this.#files = new Files(ctx.container);
    this.#context = ctx;
  }

  // -----
  // The meter. Outbound asks before each model call and reports
  // what came back, so the cap and the recorded cost come from
  // here, not from a file the container can write.
  // -----
  async meterAllows(): Promise<boolean> {
    const meter = await this.ctx.storage.get<Meter>(SCAN_SANDBOX_METER_KEY);
    return meter !== undefined && meter.spentUsd < meter.budgetUsd;
  }

  async meterRecord(model: string, tokens: MeteredTokens): Promise<void> {
    const meter = await this.ctx.storage.get<Meter>(SCAN_SANDBOX_METER_KEY);
    if (meter === undefined) return;
    await this.ctx.storage.put<Meter>(SCAN_SANDBOX_METER_KEY, {
      ...meter,
      inputTokens: meter.inputTokens + tokens.inputTokens,
      outputTokens: meter.outputTokens + tokens.outputTokens,
      cacheReadTokens: meter.cacheReadTokens + tokens.cacheReadTokens,
      cacheWriteTokens: meter.cacheWriteTokens + tokens.cacheWriteTokens,
      spentUsd: meter.spentUsd + priceUsage(model, tokens),
    });
  }

  // -----
  // Clones the repo (at the ref, if one was asked for) and
  // returns the commit that was read, and the branch when it
  // was one: git's own answer for a plain clone, the ref when
  // it was fetched as a branch, nothing for a tag or a commit. A second call after a
  // retry finds the marker and returns the same commit.
  // -----
  async prepare(repoUrl: string, ref?: string, github?: OutboundGithub): Promise<ScanCheckout> {
    console.log("scan: starting container");
    await this.#start(github);
    if ((await this.#readText(SCAN_SANDBOX_CLONED_MARKER)) === null) {
      console.log("scan: cloning", repoUrl, ref ?? "");
      await this.#sh(buildCloneScript(), ref ? [repoUrl, ref] : [repoUrl], SCAN_SANDBOX_CLONE_GUARD_MS);
      await this.#files.writeFile(SCAN_SANDBOX_CLONED_MARKER, "ok");
    }
    const commitSha = (await this.#readText(SCAN_SANDBOX_COMMIT_FILE))?.trim() || null;
    if (ref) return { commitSha, branch: (await this.#readText(SCAN_SANDBOX_KIND_FILE))?.trim() === "branch" ? ref : null };
    return { commitSha, branch: normalizeBranchName((await this.#readText(SCAN_SANDBOX_BRANCH_FILE)) ?? "") };
  }

  async launchAgent(options: ScanOptions, priors: PriorFinding[] = []): Promise<void> {
    console.log("scan: running agent", options, `${priors.length} prior findings`);
    if ((await this.ctx.storage.get(SCAN_SANDBOX_METER_KEY)) === undefined) {
      await this.ctx.storage.put<Meter>(SCAN_SANDBOX_METER_KEY, {
        budgetUsd: options.maxBudgetUsd,
        spentUsd: 0,
        inputTokens: 0,
        outputTokens: 0,
        cacheReadTokens: 0,
        cacheWriteTokens: 0,
      });
    }
    if (priors.length > 0) await this.#files.writeFile(SCAN_SANDBOX_PRIOR_PATH, JSON.stringify(priors, null, 2));
    await this.#files.writeFile(SCAN_SANDBOX_PROMPT_PATH, buildAgentPrompt(options, priors.length));
    await this.#container.exec(["/bin/sh", "-c", buildAgentScript(options)], {
      cwd: SCAN_SANDBOX_REPO_DIR,
      env: SCAN_SANDBOX_AGENT_ENV,
      stdout: "ignore",
      stderr: "ignore",
    });
  }

  async pollAgent(): Promise<AgentState> {
    if (!this.#container.running) return { state: "failed", error: "the container stopped before the agent finished" };
    const exitCode = (await this.#readText(SCAN_SANDBOX_AGENT_EXIT))?.trim();
    if (!exitCode) return { state: "running" };
    if (exitCode === "0") return { state: "succeeded" };
    return { state: "failed", error: `claude exited ${exitCode}: ${await this.agentLogTail()}` };
  }

  async agentLogTail(): Promise<string> {
    const log = (await this.#readText(SCAN_SANDBOX_AGENT_LOG)) ?? "(no agent log)";
    const err = (await this.#readText(SCAN_SANDBOX_AGENT_ERR))?.trim();
    return `${err ? `${err.slice(-SCAN_SANDBOX_LOG_TAIL_CHARS)} ` : ""}${log.slice(-SCAN_SANDBOX_LOG_TAIL_CHARS)}`;
  }

  async readUsage(): Promise<ScanUsage | null> {
    const meter = await this.ctx.storage.get<Meter>(SCAN_SANDBOX_METER_KEY);
    const log = await this.#readText(SCAN_SANDBOX_AGENT_LOG);
    const reported = log === null ? null : parseAgentUsage(log);
    if (meter === undefined) return reported;
    return {
      inputTokens: meter.inputTokens,
      outputTokens: meter.outputTokens,
      cacheReadTokens: meter.cacheReadTokens,
      cacheWriteTokens: meter.cacheWriteTokens,
      costUsd: meter.spentUsd,
      turns: reported?.turns ?? null,
      durationMs: reported?.durationMs ?? null,
    };
  }

  async readFiles(): Promise<ScanFiles> {
    console.log("scan: reading deliverables");
    const files: ScanFiles = {};
    for (const name of SCAN_REPORT_FILES) {
      const text = await this.#readText(`${SCAN_SANDBOX_OUT_DIR}/${name}`);
      if (text !== null) files[name] = text;
    }
    if (files["REPORT.md"] === undefined) {
      throw new Error(`the audit finished without writing REPORT.md. ${await this.agentLogTail()}`);
    }
    return files;
  }

  async destroy(): Promise<void> {
    console.log("scan: destroying container");
    if (this.#container.running) await this.#container.destroy();
    await this.ctx.storage.deleteAll();
  }

  async #readText(path: string): Promise<string | null> {
    try {
      return await (await this.#files.readFile(path)).text();
    } catch {
      return null;
    }
  }

  async #start(github?: OutboundGithub): Promise<void> {
    if (this.#container.running) return;
    const outbound = this.#context.exports.Outbound({ props: { sandboxId: this.#context.id.toString(), github } });
    this.#container.start({
      image: this.#container.images.sandbox,
      instance: SCAN_SANDBOX_INSTANCE_TYPE,
      enableInternet: false,
    });
    await this.#container.interceptAllOutboundHttp(outbound);
    await this.#container.interceptOutboundHttps("*", outbound);
    await this.#container.setInactivityTimeout(SCAN_SANDBOX_INACTIVITY_MS);
  }

  async #sh(script: string, args: string[], guardMs: number): Promise<void> {
    const process = await this.#container.exec(["/bin/sh", "-c", script, "sh", ...args], {
      cwd: SCAN_SANDBOX_WORK_DIR,
      env: SCAN_SANDBOX_TRUST_ENV,
    });
    let timer: ReturnType<typeof setTimeout> | undefined;
    const guard = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error(`command did not finish within ${guardMs / 1000}s`)), guardMs);
    });
    try {
      const output = await Promise.race([process.output(), guard]);
      if (output.exitCode !== 0) {
        const decoder = new TextDecoder();
        const detail = (decoder.decode(output.stderr) || decoder.decode(output.stdout)).slice(-SCAN_SANDBOX_LOG_TAIL_CHARS);
        throw new Error(`command exited ${output.exitCode}: ${detail}`);
      }
    } finally {
      if (timer !== undefined) clearTimeout(timer);
    }
  }
}
