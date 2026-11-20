import { describe, expect, it } from "vitest";
import type { ScanOptions } from "#/schemas";
import { SCAN_SANDBOX_FULL_PHASES, SCAN_SANDBOX_PHASE_SKILL_PHASES } from "#/modules/scan-sandbox/constants";
import { buildAgentPrompt, buildAgentScript, buildCloneScript, buildPhasePrompt, phaseAgentFiles, type PromptPlace } from "#/modules/scan-sandbox/utils";

const RUNNER_PLACE: PromptPlace = { repoDir: "./repo", outDir: "./out", networkRule: "do not use the network", validatedBy: "runner", metered: false };

const options: ScanOptions = { skill: "full", model: "claude-haiku-5-5", effort: "low", profile: "quick", maxBudgetUsd: 1 };

const CRITIC_SENTENCE = "After the last hunter wave, run the critic pass with a separate sub-agent. Record it in `critic_passes` in run-metadata.json.";
const VERIFIER_SENTENCE =
  "Verify each candidate with a separate sub-agent, not with yourself. Record its ID as the `agent_id` of the check in the ledger. If you cannot start a sub-agent, set `run_status` to `incomplete` and `incomplete_reason` to `verification_unavailable`. If the hunt left no candidates there is nothing to verify and no verifier is needed: that is a finished run, not `verification_unavailable`.";
const DEEP_CRITIC_SENTENCE =
  "After each hunter wave, run the critic pass with a separate sub-agent. Record each in `critic_passes` in run-metadata.json. If a critic pass accepts something, hunt another wave. Stop when a critic pass accepts nothing.";
const DEEP_FINAL_SENTENCE =
  "Then verify each final record with another separate sub-agent. It must not be the unit's owner or a verifier that checked the unit. Record each in `final_verifiers` in run-metadata.json.";
const ASKED_SENTENCES = [CRITIC_SENTENCE, VERIFIER_SENTENCE, DEEP_CRITIC_SENTENCE, DEEP_FINAL_SENTENCE];

const sharedLines =(text: string) => text.split("\n").filter((line) => !/^(Target|Output directory|The money|Do not use the network|There is no network)/.test(line));

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

  it("gives a Phase its own prompt, log, exit file and lock, and what the pool still holds as the cap", () => {
    const script = buildAgentScript({ ...options, skill: "full" }, phaseAgentFiles("hunt"), 1.25);

    expect(script.startsWith("mkdir /workspace/agent-hunt.lock 2>/dev/null || exit 0")).toBe(true);
    expect(script).toContain("--max-budget-usd 1.25");
    expect(script).toContain('"$(cat /workspace/prompt-hunt.txt)"');
    expect(script).toContain("> /workspace/agent-hunt.log 2> /workspace/agent-hunt.err");
    expect(script).toContain("echo $? > /workspace/agent-hunt.exit.tmp && mv /workspace/agent-hunt.exit.tmp /workspace/agent-hunt.exit");
    expect(script).not.toContain("/workspace/agent.");
  });

  it("gives no two Phases a file in common, so a later one never reads the exit code of an earlier one", () => {
    const files = SCAN_SANDBOX_FULL_PHASES.flatMap((phase) => Object.values(phaseAgentFiles(phase)));

    expect(new Set(files).size).toBe(files.length);
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
  it.each(["lite", "full"] as const)("names the full skill and the profile whatever the options' skill (%s), and sets no count of agents", (skill) => {
    const prompt = buildAgentPrompt({ ...options, skill, profile: "deep" });

    expect(prompt).toContain("security-audit skill in FULL AUDIT mode");
    expect(prompt).not.toContain("security-audit-lite");
    expect(prompt).toContain("Profile: deep");
    expect(prompt).not.toContain("agent invocations");
  });

  it.each([
    ["recon", "Phase 1 (Reconnaissance)", "This is the first run", { quick: [], standard: [], deep: [] }],
    ["hunt", "Phase 2 (Coverage-led hunting waves)", "Do not redo reconnaissance", { quick: [], standard: [CRITIC_SENTENCE], deep: [DEEP_CRITIC_SENTENCE] }],
    ["check", "Phases 3, 4 and 5", "Do not hunt again", { quick: [VERIFIER_SENTENCE], standard: [VERIFIER_SENTENCE], deep: [VERIFIER_SENTENCE, DEEP_FINAL_SENTENCE] }],
    ["report", "Phase 6 (Target-neutral report)", "Do not hunt or validate again", { quick: [], standard: [], deep: [] }],
  ] as const)("tells the %s run which part of the skill it does and what the earlier runs left", (phase, skillPhases, handoff, asked) => {
    const prompt = buildPhasePrompt({ ...options, skill: "full", profile: "deep" }, phase);

    const sentencesOf = (profile: ScanOptions["profile"], place?: PromptPlace) =>
      ASKED_SENTENCES.filter((sentence) => buildPhasePrompt({ ...options, skill: "full", profile }, phase, place).includes(sentence));
    expect({
      cloud: { quick: sentencesOf("quick"), standard: sentencesOf("standard"), deep: sentencesOf("deep") },
      runner: {
        quick: sentencesOf("quick", RUNNER_PLACE),
        standard: sentencesOf("standard", RUNNER_PLACE),
        deep: sentencesOf("deep", RUNNER_PLACE),
      },
    }).toEqual({ cloud: asked, runner: asked });

    expect(prompt).toContain("security-audit skill in FULL AUDIT mode");
    expect(prompt).toContain(`This run does ${skillPhases}`);
    expect(prompt).toContain(handoff);
    expect(prompt).toContain("Profile: deep");

    const onRunner = buildPhasePrompt({ ...options, skill: "full", profile: "deep" }, phase, RUNNER_PLACE);
    const otherParts = Object.entries(SCAN_SANDBOX_PHASE_SKILL_PHASES).filter(([other]) => other !== phase);

    expect(onRunner).toContain(`This run does ${skillPhases}`);
    expect(otherParts.filter(([, part]) => onRunner.includes(part))).toEqual([]);
    expect(onRunner).toContain("so stop when yours is done");
    expect(onRunner).toContain("./repo");
    expect(onRunner).not.toMatch(/node command|money|deferred/i);
    expect(onRunner).not.toMatch(/(do not|never|no|without)\s+(start\s+|use\s+|run\s+|spawn\s+)?sub-?agents?/i);
    expect(sharedLines(onRunner).slice(0, 5)).toEqual(sharedLines(prompt).slice(0, 5));
  });

  it.each([
    ["recon", false],
    ["hunt", true],
    ["check", true],
    ["report", false],
  ] as const)("tells the %s run to wait for its sub-agents in the foreground: %s", (phase, told) => {
    const prompts = (["quick", "standard", "deep"] as const).flatMap((profile) => [
      buildPhasePrompt({ ...options, skill: "full", profile }, phase),
      buildPhasePrompt({ ...options, skill: "full", profile }, phase, RUNNER_PLACE),
    ]);

    expect(prompts.map((prompt) => prompt.includes("Run each sub-agent in the foreground and wait for its result"))).toEqual(prompts.map(() => told));
    expect(prompts.map((prompt) => prompt.includes("never sleep or schedule a wakeup"))).toEqual(prompts.map(() => told));
  });

  it("has only the check and report runs validate, and only the report run write the report files", () => {
    const full: ScanOptions = { ...options, skill: "full" };

    expect(buildPhasePrompt(full, "recon")).not.toContain("validators");
    expect(buildPhasePrompt(full, "hunt")).not.toContain("validators");
    expect(buildPhasePrompt(full, "check")).toContain("run the skill's validators");
    expect(buildPhasePrompt(full, "check")).toContain("Do not write the report files in this run");
    expect(buildPhasePrompt(full, "report")).toContain("Finish by producing REPORT.md");
  });

  it("tells a Runner's check run that a refused validator is expected and that no candidates need no verifier", () => {
    const full: ScanOptions = { ...options, skill: "full" };
    const check = buildPhasePrompt(full, "check", RUNNER_PLACE);

    expect(check).toContain("If a validator is refused to you, that is expected here");
    expect(check).toContain("nothing to verify and no verifier is needed");
  });

  it("tells every run but the report to write down what it did not reach when its money runs out", () => {
    const full: ScanOptions = { ...options, skill: "full" };

    expect(buildPhasePrompt(full, "hunt")).toContain("record every unit you did not reach as deferred");
    expect(buildPhasePrompt(full, "report")).not.toContain("deferred");
  });

  it("has the agent run the validators in the container and the app run them on a Runner", () => {
    const full: ScanOptions = { ...options, skill: "full" };
    const onRunner = buildAgentPrompt(full, RUNNER_PLACE);

    expect(buildAgentPrompt(full)).toContain("run the skill's validators");
    expect(onRunner).toContain("Do not run the validators or any node command");
    expect(onRunner).not.toContain("run the skill's validators");
  });
});
