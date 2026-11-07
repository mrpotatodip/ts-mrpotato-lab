import { Files } from "@cloudflare/sandbox";
import { DurableObject } from "cloudflare:workers";
import type { ScanUsage } from "@repo/contracts/elise";
import { SCAN_REPORT_FILES } from "#/constants";
import type { ScanFiles } from "#/lib/scan-file-types";
import type { ScanOptions } from "#/schemas";
import type { Bindings } from "#/types/variables";
import {
  SCAN_SANDBOX_AGENT_ENV,
  SCAN_SANDBOX_AGENT_ERR,
  SCAN_SANDBOX_AGENT_EXIT,
  SCAN_SANDBOX_AGENT_LOG,
  SCAN_SANDBOX_CLONE_GUARD_MS,
  SCAN_SANDBOX_CLONED_MARKER,
  SCAN_SANDBOX_INACTIVITY_MS,
  SCAN_SANDBOX_INSTANCE_TYPE,
  SCAN_SANDBOX_LOG_TAIL_CHARS,
  SCAN_SANDBOX_OUT_DIR,
  SCAN_SANDBOX_PROMPT_PATH,
  SCAN_SANDBOX_REPO_DIR,
  SCAN_SANDBOX_TRUST_ENV,
  SCAN_SANDBOX_WORK_DIR,
} from "#/modules/scan-sandbox/constants";
import type { AgentState, OutboundExport } from "#/modules/scan-sandbox/types";
import { buildAgentPrompt, buildAgentScript, buildCloneScript, parseAgentUsage } from "#/modules/scan-sandbox/utils";

type SandboxContext = DurableObjectState & { exports: { Outbound: OutboundExport } };

export class ScanSandbox extends DurableObject<Bindings> {
  readonly #container: NonNullable<DurableObjectState["container"]>;
  readonly #files: Files;
  readonly #outbound: Fetcher;

  constructor(ctx: SandboxContext, env: Bindings) {
    super(ctx, env);
    if (!ctx.container) throw new Error("The container binding is not configured");
    this.#container = ctx.container;
    this.#files = new Files(ctx.container);
    this.#outbound = ctx.exports.Outbound({});
  }

  async prepare(repoUrl: string): Promise<void> {
    console.log("scan: starting container");
    await this.#start();
    if ((await this.#readText(SCAN_SANDBOX_CLONED_MARKER)) !== null) return;
    console.log("scan: cloning", repoUrl);
    await this.#sh(buildCloneScript(), [repoUrl], SCAN_SANDBOX_CLONE_GUARD_MS);
    await this.#files.writeFile(SCAN_SANDBOX_CLONED_MARKER, "ok");
  }

  async launchAgent(options: ScanOptions): Promise<void> {
    console.log("scan: running agent", options);
    await this.#files.writeFile(SCAN_SANDBOX_PROMPT_PATH, buildAgentPrompt(options));
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
    const log = await this.#readText(SCAN_SANDBOX_AGENT_LOG);
    return log === null ? null : parseAgentUsage(log);
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

  async #start(): Promise<void> {
    if (this.#container.running) return;
    this.#container.start({
      image: this.#container.images.sandbox,
      instance: SCAN_SANDBOX_INSTANCE_TYPE,
      enableInternet: false,
    });
    await this.#container.interceptAllOutboundHttp(this.#outbound);
    await this.#container.interceptOutboundHttps("*", this.#outbound);
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
