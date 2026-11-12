import { Files } from "@cloudflare/sandbox";
import { DurableObject } from "cloudflare:workers";
import type { ScanUsage } from "@repo/contracts/elise";
import { SCAN_REPORT_FILES } from "#/constants";
import type { ScanFiles } from "#/lib/scan-file-types";
import type { ScanPath } from "#/lib/scan-path";
import type { ScanOptions } from "#/schemas";
import type { PriorFinding } from "#/modules/scan-records";
import type { Bindings } from "#/types/variables";
import { normalizeBranchName } from "#/modules/branches";
import { canonicalRepo } from "#/modules/scan-ledger";
import {
  SCAN_SANDBOX_AGENT_ENV,
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
  SCAN_SANDBOX_PHASES_KEY,
  SCAN_SANDBOX_PRIOR_PATH,
  SCAN_SANDBOX_PROMPT_PATH,
  SCAN_SANDBOX_REPO_DIR,
  SCAN_SANDBOX_TRUST_ENV,
  SCAN_SANDBOX_WORK_DIR,
} from "#/modules/scan-sandbox/constants";
import type { AgentState, FullPhase, Meter, MeteredTokens, OutboundAnthropicKey, OutboundExport, OutboundGithub, PhaseEnd, PhaseRecord, ScanCheckout } from "#/modules/scan-sandbox/types";
import {
  buildAgentPrompt,
  buildAgentScript,
  buildCloneScript,
  buildPhasePrompt,
  DEFAULT_AGENT_FILES,
  endedPhase,
  freshMeter,
  parseAgentUsage,
  phaseAgentFiles,
  priceUsage,
  startedPhase,
  sumOrNull,
  withReserve,
  withoutReserve,
  type AgentFiles,
} from "#/modules/scan-sandbox/utils";

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
  // Which Sandbox namespace this class is bound to, told to Outbound
  // so a model call finds this Sandbox's meter. FullScanSandbox says full.
  // -----
  protected get path(): ScanPath {
    return "lite";
  }

  // -----
  // The meter. Outbound reserves the cost of the largest possible
  // answer before each model call, gives it back when the call ends
  // and reports what came back, so the cap and the recorded cost
  // come from here, not from a file the container can write. Calls
  // in parallel each hold a reserve, so together they cannot pass
  // the cap. Nothing awaits between the read and the write, so two
  // calls never both see the same room.
  // -----
  async meterReserve(usd: number): Promise<boolean> {
    const meter = await this.ctx.storage.get<Meter>(SCAN_SANDBOX_METER_KEY);
    if (meter === undefined) return false;
    const reserved = withReserve(meter, usd);
    if (reserved === null) {
      await this.ctx.storage.put<Meter>(SCAN_SANDBOX_METER_KEY, { ...meter, refused: true });
      return false;
    }
    await this.ctx.storage.put<Meter>(SCAN_SANDBOX_METER_KEY, reserved);
    return true;
  }

  async meterRelease(usd: number): Promise<void> {
    const meter = await this.ctx.storage.get<Meter>(SCAN_SANDBOX_METER_KEY);
    if (meter === undefined) return;
    await this.ctx.storage.put<Meter>(SCAN_SANDBOX_METER_KEY, withoutReserve(meter, usd));
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
  async prepare(repoUrl: string, ref?: string, github?: OutboundGithub, anthropicKey?: OutboundAnthropicKey): Promise<ScanCheckout> {
    console.log("scan: starting container");
    await this.#start(canonicalRepo(repoUrl), github, anthropicKey);
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
        reservedUsd: 0,
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

  // -----
  // Starts one Phase of a full Scan: sets the meter's cap to what has
  // been spent plus this Phase's allowance, records the Phase, and runs
  // the agent on that Phase's prompt and files. The log shows the slice.
  // -----
  async launchPhase(options: ScanOptions, phase: FullPhase): Promise<void> {
    const started = startedPhase(options.maxBudgetUsd, phase, await this.#phaseRecords(), (await this.ctx.storage.get<Meter>(SCAN_SANDBOX_METER_KEY)) ?? freshMeter(0));
    await this.ctx.storage.put<Meter>(SCAN_SANDBOX_METER_KEY, started.meter);
    await this.ctx.storage.put<PhaseRecord[]>(SCAN_SANDBOX_PHASES_KEY, started.records);
    const allowanceUsd = started.records.find((record) => record.phase === phase)?.allowanceUsd ?? 0;
    console.log(`scan: phase ${phase} starts, slice $${allowanceUsd.toFixed(4)} of the $${options.maxBudgetUsd} cap`);
    const files = phaseAgentFiles(phase);
    await this.#files.writeFile(files.prompt, buildPhasePrompt(options, phase));
    await this.#container.exec(["/bin/sh", "-c", buildAgentScript(options, files, Number(allowanceUsd.toFixed(6)))], {
      cwd: SCAN_SANDBOX_REPO_DIR,
      env: SCAN_SANDBOX_AGENT_ENV,
      stdout: "ignore",
      stderr: "ignore",
    });
  }

  // -----
  // Closes a Phase and says what it spent, and whether it spent its
  // whole slice: the meter turned a call away. A Phase that ends with an
  // error after that did not fail, it ran out of money, and the next
  // Phase still starts with its own.
  // -----
  async endPhase(phase: FullPhase): Promise<PhaseEnd> {
    const meter = await this.ctx.storage.get<Meter>(SCAN_SANDBOX_METER_KEY);
    const records = endedPhase(await this.#phaseRecords(), phase, meter ?? freshMeter(0));
    await this.ctx.storage.put<PhaseRecord[]>(SCAN_SANDBOX_PHASES_KEY, records);
    const record = records.find((found) => found.phase === phase);
    if (record === undefined || record.spentUsd === null) throw new Error(`the ${phase} phase was never started`);
    console.log(`scan: phase ${phase} ended, spent $${record.spentUsd.toFixed(4)} of $${record.allowanceUsd.toFixed(4)}${record.exhausted ? " (slice spent)" : ""}`);
    return { phase, allowanceUsd: record.allowanceUsd, spentUsd: record.spentUsd, exhausted: record.exhausted };
  }

  async pollAgent(): Promise<AgentState> {
    if (!this.#container.running) return { state: "failed", error: "the container stopped before the agent finished" };
    const exitCode = (await this.#readText((await this.#currentFiles()).exit))?.trim();
    if (!exitCode) return { state: "running" };
    if (exitCode === "0") return { state: "succeeded" };
    return { state: "failed", error: `claude exited ${exitCode}: ${await this.agentLogTail()}` };
  }

  async agentLogTail(): Promise<string> {
    const files = await this.#currentFiles();
    const log = (await this.#readText(files.log)) ?? "(no agent log)";
    const err = (await this.#readText(files.err))?.trim();
    return `${err ? `${err.slice(-SCAN_SANDBOX_LOG_TAIL_CHARS)} ` : ""}${log.slice(-SCAN_SANDBOX_LOG_TAIL_CHARS)}`;
  }

  // -----
  // Turns and duration come from the agent's own report, one for each
  // run, and add up over a full Scan's Phases. Cost and tokens come from
  // the meter, which already holds the whole Scan.
  // -----
  async readUsage(): Promise<ScanUsage | null> {
    const meter = await this.ctx.storage.get<Meter>(SCAN_SANDBOX_METER_KEY);
    const records = await this.#phaseRecords();
    const logs = await Promise.all((records.length > 0 ? records.map((record) => phaseAgentFiles(record.phase)) : [DEFAULT_AGENT_FILES]).map((files) => this.#readText(files.log)));
    const reports = logs.flatMap((log) => (log === null ? [] : [parseAgentUsage(log)])).filter((report) => report !== null);
    const reported = reports.length === 0 ? null : { ...reports[0], turns: sumOrNull(reports.map((report) => report.turns)), durationMs: sumOrNull(reports.map((report) => report.durationMs)) };
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

  async readCheckout(): Promise<ScanCheckout | null> {
    return null;
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

  async #phaseRecords(): Promise<PhaseRecord[]> {
    return (await this.ctx.storage.get<PhaseRecord[]>(SCAN_SANDBOX_PHASES_KEY)) ?? [];
  }

  // -----
  // The files of the run that is going now: the last Phase that was
  // started, or the one run of a lite Scan.
  // -----
  async #currentFiles(): Promise<AgentFiles> {
    const last = (await this.#phaseRecords()).at(-1);
    return last === undefined ? DEFAULT_AGENT_FILES : phaseAgentFiles(last.phase);
  }

  async #readText(path: string): Promise<string | null> {
    try {
      return await (await this.#files.readFile(path)).text();
    } catch {
      return null;
    }
  }

  async #start(repo: string, github?: OutboundGithub, anthropicKey?: OutboundAnthropicKey): Promise<void> {
    if (this.#container.running) return;
    const outbound = this.#context.exports.Outbound({ props: { sandboxId: this.#context.id.toString(), repo, path: this.path, github, anthropicKey } });
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
