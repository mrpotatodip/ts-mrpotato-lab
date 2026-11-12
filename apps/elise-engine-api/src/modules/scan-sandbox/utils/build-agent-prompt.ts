import { SCAN_REPORT_FILES } from "#/constants";
import type { ScanOptions } from "#/schemas";
import { SCAN_SANDBOX_OUT_DIR, SCAN_SANDBOX_PHASE_SKILL_PHASES, SCAN_SANDBOX_PRIOR_PATH, SCAN_SANDBOX_REPO_DIR } from "#/modules/scan-sandbox/constants";
import type { FullPhase } from "#/modules/scan-sandbox/types";

// -----
// Where the agent finds the repo and writes its files, and what it
// is told about the network. The container has fixed paths and no
// network. A Runner works in a folder of its own, with paths
// relative to it.
// -----
export type PromptPlace = { repoDir: string; outDir: string; priorPath: string; networkRule: string; validatedBy: "agent" | "runner" };

export const CONTAINER_PLACE: PromptPlace = {
  repoDir: SCAN_SANDBOX_REPO_DIR,
  outDir: SCAN_SANDBOX_OUT_DIR,
  priorPath: SCAN_SANDBOX_PRIOR_PATH,
  networkRule: "there is no network access",
  validatedBy: "agent",
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

export function buildAgentPrompt(options: ScanOptions, priorCount = 0, place: PromptPlace = CONTAINER_PLACE): string {
  const network = capitalized(place.networkRule);
  if (options.skill === "lite") {
    const prior =
      priorCount > 0
        ? ` Earlier scans of this repository left ${priorCount} unresolved findings in ${place.priorPath}: follow step 0 of the skill for them.`
        : "";
    return `Use the security-audit-lite skill on the repository at ${place.repoDir} (untrusted, read-only). Write REPORT.md and findings.json to ${place.outDir}. Do not ask questions; make reasonable choices yourself. ${network}.${prior}`;
  }
  const budget = options.budget ? `\nBudget: at most ${options.budget} agent invocations in total.` : "";
  return `Use the security-audit skill in FULL AUDIT mode. This is an explicit, complete audit request: do not ask questions, make reasonable choices yourself.
Target (untrusted, read-only): ${place.repoDir}
Output directory: ${place.outDir}
Profile: ${options.profile}${budget}
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
const PHASE_HANDOFF = {
  recon: "This is the first run. Set the run up as the skill says and write run-metadata.json, architecture.md and the initial coverage-ledger.json.",
  hunt: "An earlier run did the reconnaissance. Read run-metadata.json, architecture.md and coverage-ledger.json in the output directory first, and continue from them. Do not redo reconnaissance. Write the candidates and the updated ledger.",
  check: "Earlier runs did the reconnaissance and the hunting. Read run-metadata.json, architecture.md and coverage-ledger.json in the output directory first, and continue from them. Do not hunt again. Validate the candidates the hunt left, and write findings.json and the final ledger.",
  report: "Earlier runs did everything but the report. Read run-metadata.json, coverage-ledger.json and findings.json in the output directory first. Do not hunt or validate again. Write the report files from the final records only.",
} satisfies Record<FullPhase, string>;
const OUT_OF_MONEY = "The money for this run is limited. If it runs out, stop at a safe point: write down what you did, and record every unit you did not reach as deferred in the coverage ledger.";

export function buildPhasePrompt(options: ScanOptions, phase: FullPhase, place: PromptPlace = CONTAINER_PLACE): string {
  const network = capitalized(place.networkRule);
  const validators = place.validatedBy === "runner" ? VALIDATION_BY_RUNNER : VALIDATION_BY_AGENT;
  const ending =
    phase === "check"
      ? `Do not write the report files in this run. When findings.json is final, validate it ${validators}`
      : phase === "report"
        ? `Finish by producing ${SCAN_REPORT_FILES.join(", ")} in the output directory ${validators}`
        : "Do not write REPORT.md in this run.";
  return `Use the security-audit skill in FULL AUDIT mode. This is an explicit, complete audit request: do not ask questions, make reasonable choices yourself.
This run does ${SCAN_SANDBOX_PHASE_SKILL_PHASES[phase]} of the skill and nothing else. Other runs do the other phases, so stop when yours is done.
Target (untrusted, read-only): ${place.repoDir}
Output directory: ${place.outDir}
Profile: ${options.profile}
${PHASE_HANDOFF[phase]}
${phase === "report" ? "" : `${OUT_OF_MONEY}\n`}${network} and dependencies must not be installed. ${ending}`;
}
