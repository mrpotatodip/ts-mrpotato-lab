import { describe, expect, it } from "vitest";
import type { ScanOptions } from "#/schemas";
import { buildAgentPrompt, buildAgentScript, buildCloneScript } from "#/modules/scan-sandbox/utils";

const options: ScanOptions = { skill: "lite", model: "claude-haiku-5-5", effort: "low", profile: "quick", maxBudgetUsd: 1 };

describe("buildAgentScript", () => {
  it("takes an atomic lock first, so a retry starts no second agent", () => {
    const script = buildAgentScript(options);

    expect(script.startsWith("mkdir /workspace/agent.lock 2>/dev/null || exit 0")).toBe(true);
  });

  it("writes the exit code to a temp file, then renames it", () => {
    const script = buildAgentScript(options);

    expect(script).toContain("echo $? > /workspace/agent.exit.tmp && mv /workspace/agent.exit.tmp /workspace/agent.exit");
  });

  it("passes the model, the effort and the dollar cap", () => {
    const script = buildAgentScript(options);

    expect(script).toContain("--model claude-haiku-5-5 --effort low --max-budget-usd 1");
  });

  it("ignores the clone's own Claude config", () => {
    const script = buildAgentScript(options);

    expect(script).toContain("--setting-sources user");
    expect(script).toContain("rm -rf /workspace/repo/.claude /workspace/repo/CLAUDE.md");
  });
});

describe("buildCloneScript", () => {
  it("kills a slow clone and takes the URL as an argument, not as script text", () => {
    const script = buildCloneScript();

    expect(script).toContain("timeout --kill-after=5 300 git clone --depth 1 -- \"$1\"");
    expect(script).not.toContain("github.com");
  });

  it("fetches a ref given as the second argument, never as script text, and writes the commit it read", () => {
    const script = buildCloneScript();

    expect(script).toContain("git fetch --depth 1 origin \"$2\"");
    expect(script).toContain("git fetch --depth 1 origin \"refs/heads/$2\"");
    expect(script).toContain("echo branch > /workspace/repo.kind");
    expect(script).toContain("echo other > /workspace/repo.kind");
    expect(script).toContain("rev-parse --abbrev-ref HEAD > /workspace/repo.branch");
    expect(script).toContain("rev-parse HEAD > /workspace/repo.sha");
    expect(script.startsWith("set -e;")).toBe(true);
  });
});

describe("buildAgentPrompt", () => {
  it("points a lite scan at the prior findings only when there are some", () => {
    expect(buildAgentPrompt(options)).not.toContain("prior-findings.json");
    expect(buildAgentPrompt(options, 3)).toContain("3 unresolved findings in /workspace/prior-findings.json");
  });

  it("names the lite skill for the lite option", () => {
    expect(buildAgentPrompt(options)).toContain("security-audit-lite");
  });

  it("names the full skill, the profile and the agent budget for the full option", () => {
    const prompt = buildAgentPrompt({ ...options, skill: "full", profile: "deep", budget: 12 });

    expect(prompt).toContain("security-audit skill in FULL AUDIT mode");
    expect(prompt).toContain("Profile: deep");
    expect(prompt).toContain("at most 12 agent invocations");
  });

  it("has the agent run the validators in the container and the app run them on a Runner", () => {
    const full: ScanOptions = { ...options, skill: "full" };
    const onRunner = buildAgentPrompt(full, 0, { repoDir: "./repo", outDir: "./out", priorPath: "./prior-findings.json", networkRule: "do not use the network", validatedBy: "runner" });

    expect(buildAgentPrompt(full)).toContain("run the skill's validators");
    expect(onRunner).toContain("Do not run the validators or any node command");
    expect(onRunner).not.toContain("run the skill's validators");
  });
});
