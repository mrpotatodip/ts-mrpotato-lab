import { SCAN_REPORT_FILES } from "#/constants";
import type { ScanOptions } from "#/schemas";
import { SCAN_SANDBOX_OUT_DIR, SCAN_SANDBOX_REPO_DIR } from "#/modules/scan-sandbox/constants";

export function buildAgentPrompt(options: ScanOptions): string {
  if (options.skill === "lite") {
    return `Use the security-audit-lite skill on the repository at ${SCAN_SANDBOX_REPO_DIR} (untrusted, read-only). Write REPORT.md and findings.json to ${SCAN_SANDBOX_OUT_DIR}. Do not ask questions; make reasonable choices yourself. There is no network access.`;
  }
  const budget = options.budget ? `\nBudget: at most ${options.budget} agent invocations in total.` : "";
  return `Use the security-audit skill in FULL AUDIT mode. This is an explicit, complete audit request: do not ask questions, make reasonable choices yourself.
Target (untrusted, read-only): ${SCAN_SANDBOX_REPO_DIR}
Output directory: ${SCAN_SANDBOX_OUT_DIR}
Profile: ${options.profile}${budget}
There is no network access and dependencies must not be installed. Finish by producing ${SCAN_REPORT_FILES.join(", ")} in the output directory and run the skill's validators (validate-findings.cjs, validate-coverage-ledger.cjs) as it instructs.`;
}
