import { Effect } from "effect";
import type { WorkflowStep } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import type { ScanUsage } from "@repo/contracts/elise";
import { fakeBindings } from "#/__tests__/fake-bindings";
import { memoryScanRepo } from "#/__tests__/memory-scan-repo";
import type { ScanParams, ScanState } from "#/schemas";
import type { PriorFinding } from "#/modules/scan-records";
import type { OutboundAnthropicKey, OutboundGithub } from "#/modules/scan-sandbox";
import { runScan } from "#/modules/scan-workflow/lib";
import type { SandboxPort } from "#/modules/scan-workflow/types";

const ACCOUNT = "0b8c1d2e-3f4a-4b5c-8d6e-7f8091a2b3c4";
const REPO_ID = "5d1f0c9a-2b3e-4f60-9a71-8b92c3d4e5f6";
const usage: ScanUsage = { inputTokens: 1, outputTokens: 2, cacheReadTokens: 0, cacheWriteTokens: 0, costUsd: 0.1, turns: 3, durationMs: 4000 };
const prior: PriorFinding = { priorId: "a".repeat(64), status: "confirmed", severity: "high", title: "t", class: "authz", file: "src/a.ts", line: 1 };

const params = (extra: Partial<ScanParams> = {}): ScanParams => ({
  scanId: "scan-1",
  accountId: ACCOUNT,
  repo: "https://github.com/octocat/Hello-World",
  options: { skill: "lite", model: "claude-haiku-5-5", effort: "low", profile: "quick", maxBudgetUsd: 1 },
  createdAt: new Date().toISOString(),
  ...extra,
});

// -----
// A step that runs each callback inline and writes down the
// names in order, which is all the real one adds that a run
// depends on.
// -----
const fakeStep = (names: string[]): WorkflowStep => {
  const run = async <T>(name: string, ...rest: [() => Promise<T>] | [object, () => Promise<T>]): Promise<T> => {
    names.push(name);
    return (rest.length === 1 ? rest[0] : rest[1])();
  };
  // SAFETY: only do and sleep are used by runScan; the fake keeps their calling shape.
  return { do: run, sleep: async (name: string) => void names.push(name) } as never;
};

const setup = (options: { priors?: PriorFinding[]; recordFails?: ScanState; agent?: "succeeded" | "failed" | "running"; pollThrows?: boolean; sealedKey?: string; maxPolls?: number } = {}) => {
  const names: string[] = [];
  const calls: string[] = [];
  const settles: string[] = [];
  const ledger = memoryScanRepo();
  const bindings = fakeBindings();
  const launches: PriorFinding[][] = [];
  const prepares: { ref?: string }[] = [];
  const githubs: (OutboundGithub | undefined)[] = [];
  const anthropicKeys: (OutboundAnthropicKey | undefined)[] = [];
  const sandbox: SandboxPort = {
    prepare: async (_url, ref, github, anthropicKey) => {
      prepares.push({ ref });
      githubs.push(github);
      anthropicKeys.push(anthropicKey);
      return { commitSha: "abc123", branch: ref && /^v\d/.test(ref) ? null : (ref ?? "main") };
    },
    launchAgent: async (_options, priors) => void launches.push(priors),
    pollAgent: async () => {
      if (options.pollThrows) throw new Error("sandbox unreachable");
      if (options.agent === "running") return { state: "running" };
      return options.agent === "failed" ? { state: "failed", error: "claude exited 1" } : { state: "succeeded" };
    },
    agentLogTail: async () => "log",
    readUsage: async () => usage,
    readFiles: async () => ({ "REPORT.md": "# report", "findings.json": "[]" }),
    readCheckout: async () => null,
    destroy: async () => void calls.push("destroy"),
  };
  const deps = {
    maxPolls: options.maxPolls ?? 240,
    sandbox,
    ledger: ledger.repo,
    reports: bindings.env.REPORTS,
    readPriors: async () => options.priors ?? [],
    sealedKeyFor: async () => options.sealedKey ?? null,
    recordScan: async (_params: ScanParams, status: ScanState) => {
      calls.push(`record:${status}:${ledger.rows.get("scan-1")?.status}`);
      if (options.recordFails === status) throw new Error("database down");
    },
    settleCredit: async (_params: ScanParams, status: "succeeded" | "failed") => void settles.push(status),
  };
  return { names, calls, ledger, bindings, launches, prepares, githubs, anthropicKeys, settles, deps };
};

const queue = async (ledger: ReturnType<typeof memoryScanRepo>, input: ScanParams) => {
  await Effect.runPromise(ledger.repo.create(input, REPO_ID, 0));
};

describe("runScan", () => {
  it("stops waiting for the agent after its own number of polls, and says how long that was", async () => {
    const { names, ledger, deps } = setup({ agent: "running", maxPolls: 6 });
    await queue(ledger, params());

    await expect(runScan(deps, params(), fakeStep(names))).rejects.toThrow("the agent timed out after 1 minutes");
    expect(names.filter((name) => name.startsWith("poll-"))).toHaveLength(6);
    expect(ledger.rows.get("scan-1")).toMatchObject({ status: "failed" });
  });

  it("saves the results first: the scan is still running when it is recorded, and succeeded after", async () => {
    const { names, calls, ledger, deps } = setup();
    await queue(ledger, params());

    await runScan(deps, params(), fakeStep(names));

    expect(calls).toEqual(["record:succeeded:running", "destroy"]);
    expect(ledger.rows.get("scan-1")).toMatchObject({ status: "succeeded", error: null, usage, commitSha: "abc123" });
    expect(names.indexOf("record-scan-succeeded")).toBeLessThan(names.indexOf("status-succeeded"));
  });

  it("hands the clone the install and repo to sign for, and nothing else of the install", async () => {
    const github = { installationRowId: "7c1e4a52-9d3b-4f60-8a71-2b3c4d5e6f70", installationId: 42, repoId: 7, repo: "octocat/hello-world", isPrivate: true };
    const signed = setup();
    await queue(signed.ledger, params({ github }));
    await runScan(signed.deps, params({ github }), fakeStep(signed.names));
    const open = setup();
    await queue(open.ledger, params());
    await runScan(open.deps, params(), fakeStep(open.names));

    expect(signed.githubs).toEqual([{ installationId: 42, repoId: 7, repo: "octocat/hello-world" }]);
    expect(open.githubs).toEqual([undefined]);
  });

  it("hands the sandbox the account's sealed Anthropic key, and nothing for an account on the platform key", async () => {
    const own = setup({ sealedKey: "iv.ciphertext" });
    await queue(own.ledger, params({ keySource: "account" }));
    await runScan(own.deps, params({ keySource: "account" }), fakeStep(own.names));
    const platform = setup();
    await queue(platform.ledger, params());
    await runScan(platform.deps, params(), fakeStep(platform.names));

    expect(own.anthropicKeys).toEqual([{ accountId: ACCOUNT, sealed: "iv.ciphertext" }]);
    expect(platform.anthropicKeys).toEqual([undefined]);
  });

  it("never opens a stored key for a scan the plan put on the platform key", async () => {
    const stored = setup({ sealedKey: "iv.ciphertext" });
    await queue(stored.ledger, params({ keySource: "platform" }));

    await runScan(stored.deps, params({ keySource: "platform" }), fakeStep(stored.names));

    expect(stored.anthropicKeys).toEqual([undefined]);
  });

  it("settles the scan's credit once it has succeeded", async () => {
    const { names, ledger, deps, settles } = setup();
    await queue(ledger, params());

    await runScan(deps, params(), fakeStep(names));

    expect(settles).toEqual(["succeeded"]);
  });

  it("settles the scan's credit when it fails, and still reports the failure", async () => {
    const { names, ledger, deps, settles } = setup({ agent: "failed" });
    await queue(ledger, params());

    await expect(runScan(deps, params(), fakeStep(names))).rejects.toThrow("claude exited 1");
    expect(settles).toEqual(["failed"]);
  });

  it("lets a scan succeed when its credit cannot be settled", async () => {
    const { names, ledger, deps } = setup();
    await queue(ledger, params());
    const broken = { ...deps, settleCredit: async () => Promise.reject(new Error("database down")) };

    await expect(runScan(broken, params(), fakeStep(names))).resolves.toEqual({ ok: true });
  });

  it("saves the branch the clone reported, with the commit", async () => {
    const { names, ledger, deps } = setup();
    await queue(ledger, params());

    await runScan(deps, params(), fakeStep(names));

    expect(ledger.rows.get("scan-1")).toMatchObject({ commitSha: "abc123", branch: "main" });
  });

  it("hands the ref as it was typed to the clone, and saves the branch the clone reports: a branch, or none for a tag", async () => {
    const onBranch = setup();
    await queue(onBranch.ledger, params({ ref: "release" }));
    await runScan(onBranch.deps, params({ ref: "release" }), fakeStep(onBranch.names));
    const onTag = setup();
    await queue(onTag.ledger, params({ ref: "v1.0.0" }));
    await runScan(onTag.deps, params({ ref: "v1.0.0" }), fakeStep(onTag.names));

    expect(onBranch.prepares).toEqual([{ ref: "release" }]);
    expect(onBranch.ledger.rows.get("scan-1")).toMatchObject({ branch: "release" });
    expect(onTag.prepares).toEqual([{ ref: "v1.0.0" }]);
    expect(onTag.ledger.rows.get("scan-1")).toMatchObject({ branch: null });
  });

  it("saves the priors with the scan before the agent starts, and hands the same list to the agent", async () => {
    const { names, ledger, bindings, launches, deps } = setup({ priors: [prior] });
    await queue(ledger, params());

    await runScan(deps, params(), fakeStep(names));

    expect(names.indexOf("read-priors")).toBeLessThan(names.indexOf("launch-agent"));
    expect(launches).toEqual([[prior]]);
    expect(JSON.parse(bindings.store.get(`accounts/${ACCOUNT}/scans/scan-1/prior-findings.json`) ?? "null")).toEqual([prior]);
    expect(ledger.files.get("scan-1/prior-findings.json")).toMatchObject({ name: "prior-findings.json" });
  });

  it("saves no priors file when there are no priors", async () => {
    const { names, ledger, bindings, launches, deps } = setup();
    await queue(ledger, params());

    await runScan(deps, params(), fakeStep(names));

    expect(launches).toEqual([[]]);
    expect(bindings.store.has(`accounts/${ACCOUNT}/scans/scan-1/prior-findings.json`)).toBe(false);
  });

  it("fails the scan when its results cannot be recorded, and still tries to record the failure", async () => {
    const { names, calls, ledger, deps } = setup({ recordFails: "succeeded" });
    await queue(ledger, params());

    await expect(runScan(deps, params(), fakeStep(names))).rejects.toThrow("could not be recorded: database down");

    expect(ledger.rows.get("scan-1")).toMatchObject({ status: "failed", error: expect.stringContaining("the results were saved but could not be recorded") });
    expect(calls).toEqual(["record:succeeded:running", "record:failed:failed", "destroy"]);
  });

  it("fails the scan with the agent's error, and survives a failure to record the failure", async () => {
    const { names, ledger, deps } = setup({ agent: "failed", recordFails: "failed" });
    await queue(ledger, params());

    await expect(runScan(deps, params(), fakeStep(names))).rejects.toThrow("claude exited 1");

    expect(ledger.rows.get("scan-1")).toMatchObject({ status: "failed", error: "claude exited 1" });
    expect(names).not.toContain("record-scan-succeeded");
  });

  it("keeps the spend of a scan whose polling threw after the agent started", async () => {
    const { names, ledger, deps } = setup({ pollThrows: true });
    await queue(ledger, params());

    await expect(runScan(deps, params(), fakeStep(names))).rejects.toThrow("sandbox unreachable");

    expect(ledger.rows.get("scan-1")).toMatchObject({ status: "failed", error: "sandbox unreachable", usage });
  });

  it("does not let a scan that a newer request closed come back to life", async () => {
    const { names, ledger, deps } = setup();
    await queue(ledger, params());
    await Effect.runPromise(ledger.repo.mark(ACCOUNT, "scan-1", { status: "failed", error: "closed by a newer request" }));

    await runScan(deps, params(), fakeStep(names));

    expect(ledger.rows.get("scan-1")).toMatchObject({ status: "failed", error: "closed by a newer request" });
  });
});
