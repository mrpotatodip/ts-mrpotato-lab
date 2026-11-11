import { SCAN_REPORT_FILES } from "#/constants";
import type { ScanOptions } from "#/schemas";
import { SCAN_SANDBOX_OUT_DIR, SCAN_SANDBOX_PRIOR_PATH, SCAN_SANDBOX_REPO_DIR } from "#/modules/scan-sandbox/constants";

// -----
// Where the agent finds the repo and writes its files, and what it
// is told about the network. The container has fixed paths and no
// network. A Runner works in a folder of its own, with paths
// relative to it.
// -----
export type PromptPlace = { repoDir: string; outDir: string; priorPath: string; networkRule: string };

export const CONTAINER_PLACE: PromptPlace = {
  repoDir: SCAN_SANDBOX_REPO_DIR,
  outDir: SCAN_SANDBOX_OUT_DIR,
  priorPath: SCAN_SANDBOX_PRIOR_PATH,
  networkRule: "there is no network access",
};

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
${network} and dependencies must not be installed. Finish by producing ${SCAN_REPORT_FILES.join(", ")} in the output directory and run the skill's validators (validate-findings.cjs, validate-coverage-ledger.cjs) as it instructs.`;
}
