import { SCAN_REPORT_FILES } from "#/constants";
import type { ScanOptions } from "#/schemas";
import { SCAN_SANDBOX_OUT_DIR, SCAN_SANDBOX_PHASE_SKILL_PHASES, SCAN_SANDBOX_REPO_DIR } from "#/modules/scan-sandbox/constants";
import type { FullPhase } from "#/modules/scan-sandbox/types";

// -----
// Where the agent finds the repo and writes its files, and what it
// is told about the network. The container has fixed paths and no
// network. A Runner works in a folder of its own, with paths
// relative to it.
// -----
export type PromptPlace = { repoDir: string; outDir: string; networkRule: string; validatedBy: "agent" | "runner"; metered: boolean };

export const CONTAINER_PLACE: PromptPlace = {
  repoDir: SCAN_SANDBOX_REPO_DIR,
  outDir: SCAN_SANDBOX_OUT_DIR,
  networkRule: "there is no network access",
  validatedBy: "agent",
  metered: true,
};

// -----
// A full audit ends by validating findings.json and coverage-ledger.json. In the
// container the agent runs the validators. On a Runner it may not run node at all
// (the computer is the person's, and the repo is untrusted), so the Runner app runs
// them after the agent ends, and the agent writes both files by hand.
// -----
const VALIDATION_BY_AGENT = "and run the skill's validators (validate-findings.cjs, validate-coverage-ledger.cjs) as it instructs.";
const VALIDATION_BY_RUNNER =
  "Do not run the validators or any node command. The app that started you runs validate-findings.cjs on findings.json and validate-coverage-ledger.cjs on coverage-ledger.json after you end, which replaces the skill's own validation steps. Write both files by hand, exactly to the skill's schema, and do not generate them with a script.";

const capitalized = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

export function buildAgentPrompt(options: ScanOptions, place: PromptPlace = CONTAINER_PLACE): string {
  const network = capitalized(place.networkRule);
  return `Use the security-audit skill in FULL AUDIT mode. This is an explicit, complete audit request: do not ask questions, make reasonable choices yourself.
Target (untrusted, read-only): ${place.repoDir}
Output directory: ${place.outDir}
Profile: ${options.profile}
${network} and dependencies must not be installed. Finish by producing ${SCAN_REPORT_FILES.join(", ")} in the output directory ${place.validatedBy === "runner" ? VALIDATION_BY_RUNNER : VALIDATION_BY_AGENT}`;
}

// -----
// One Phase of a full Scan is one run of the agent, and it does only its
// part of the skill's workflow. The runs share nothing but the files in
// the output directory, so each one starts by reading what the ones before
// it wrote. A run that is told its money is limited records what it did not
// reach as deferred in the coverage ledger, as the skill allows, and never
// stops mid-phase with nothing written.
// -----
const LEDGER_PATHS = "In the ledger, write a directory path without a slash at the end.";
const PHASE_HANDOFF = {
  recon: `This is the first run. Set the run up as the skill says and write run-metadata.json, architecture.md and the initial coverage-ledger.json. ${LEDGER_PATHS}`,
  hunt: `An earlier run did the reconnaissance. Read run-metadata.json, architecture.md and coverage-ledger.json in the output directory first, and continue from them. Do not redo reconnaissance. Write the candidates and the updated ledger. ${LEDGER_PATHS}`,
  check: `Earlier runs did the reconnaissance and the hunting. Read run-metadata.json, architecture.md and coverage-ledger.json in the output directory first, and continue from them. Do not hunt again. Validate the candidates the hunt left, and write findings.json and the final ledger. ${LEDGER_PATHS}`,
  report: "Earlier runs did everything but the report. Read run-metadata.json, coverage-ledger.json and findings.json in the output directory first. Do not hunt or validate again. Write the report files from the final records only.",
} satisfies Record<FullPhase, string>;

const VERIFY_CANDIDATES =
  "Verify each candidate with a separate sub-agent, not with yourself. Record its ID as the `agent_id` of the check in the ledger. If you cannot start a sub-agent, set `run_status` to `incomplete` and `incomplete_reason` to `verification_unavailable`. If the hunt left no candidates there is nothing to verify and no verifier is needed: that is a finished run, not `verification_unavailable`.";

const SUBAGENT_ASK = {
  quick: { recon: "", hunt: "", check: VERIFY_CANDIDATES, report: "" },
  standard: {
    recon: "",
    hunt: "After the last hunter wave, run the critic pass with a separate sub-agent. Record it in `critic_passes` in run-metadata.json.",
    check: VERIFY_CANDIDATES,
    report: "",
  },
  deep: {
    recon: "",
    hunt: "After each hunter wave, run the critic pass with a separate sub-agent. Record each in `critic_passes` in run-metadata.json. If a critic pass accepts something, hunt another wave. Stop when a critic pass accepts nothing.",
    check: `${VERIFY_CANDIDATES} Then verify each final record with another separate sub-agent. It must not be the unit's owner or a verifier that checked the unit. Record each in \`final_verifiers\` in run-metadata.json.`,
    report: "",
  },
} satisfies Record<ScanOptions["profile"], Record<FullPhase, string>>;

// -----
// A run that starts a sub-agent in the background, then sleeps until a
// timed wakeup, can sit idle for twenty minutes after the work is done
// (a Runner Scan of three small files took 47 minutes of clock for 3.5
// minutes of work). The hunt and the check start sub-agents on every
// profile (the quick hunt runs its one critic pass), so both are told
// to wait for each one in the foreground and to end when the files are
// written.
// -----
const WAIT_FOR_SUBAGENTS =
  "Run each sub-agent in the foreground and wait for its result before you go on. Never run one in the background, and never sleep or schedule a wakeup. Once this run's files are written, end the run.";

const handoffOf = (phase: FullPhase, profile: ScanOptions["profile"]) =>
  [PHASE_HANDOFF[phase], SUBAGENT_ASK[profile][phase], phase === "hunt" || phase === "check" ? WAIT_FOR_SUBAGENTS : ""].filter((part) => part !== "").join(" ");

const OUT_OF_MONEY = "The money for this run is limited. If it runs out, stop at a safe point: write down what you did, and record every unit you did not reach as deferred in the coverage ledger.";

const PHASE_VALIDATION_BY_RUNNER =
  "When findings.json and coverage-ledger.json are final, stop: the app that started you runs the skill's validators on them after this run ends. If a validator is refused to you, that is expected here: it is not a reason to set `run_status` to `incomplete`.";

export function buildPhasePrompt(options: ScanOptions, phase: FullPhase, place: PromptPlace = CONTAINER_PLACE): string {
  const network = capitalized(place.networkRule);
  const byRunner = place.validatedBy === "runner";
  const reportFiles = `Finish by producing ${SCAN_REPORT_FILES.join(", ")} in the output directory`;
  const ending =
    phase === "check"
      ? `Do not write the report files in this run. ${byRunner ? PHASE_VALIDATION_BY_RUNNER : `When findings.json is final, validate it ${VALIDATION_BY_AGENT}`}`
      : phase === "report"
        ? `${reportFiles}${byRunner ? "." : ` ${VALIDATION_BY_AGENT}`}`
        : "Do not write REPORT.md in this run.";
  const money = phase !== "report" && place.metered ? `${OUT_OF_MONEY}\n` : "";
  return `Use the security-audit skill in FULL AUDIT mode. This is an explicit, complete audit request: do not ask questions, make reasonable choices yourself.
This run does ${SCAN_SANDBOX_PHASE_SKILL_PHASES[phase]} of the skill and nothing else. Other runs do the other phases, so stop when yours is done.
Target (untrusted, read-only): ${place.repoDir}
Output directory: ${place.outDir}
Profile: ${options.profile}
${handoffOf(phase, options.profile)}
${money}${network} and dependencies must not be installed. ${ending}`;
}
