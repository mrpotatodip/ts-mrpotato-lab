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
});

describe("buildCloneScript", () => {
  it("kills a slow clone and takes the URL as an argument, not as script text", () => {
    const script = buildCloneScript();

    expect(script).toContain("timeout --kill-after=5 300 git clone --depth 1 -- \"$1\"");
    expect(script).not.toContain("github.com");
  });
});

describe("buildAgentPrompt", () => {
  it("names the lite skill for the lite option", () => {
    expect(buildAgentPrompt(options)).toContain("security-audit-lite");
  });

  it("names the full skill, the profile and the agent budget for the full option", () => {
    const prompt = buildAgentPrompt({ ...options, skill: "full", profile: "deep", budget: 12 });

    expect(prompt).toContain("security-audit skill in FULL AUDIT mode");
    expect(prompt).toContain("Profile: deep");
    expect(prompt).toContain("at most 12 agent invocations");
  });
});
