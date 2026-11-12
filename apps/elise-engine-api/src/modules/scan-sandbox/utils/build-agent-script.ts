import type { ScanOptions } from "#/schemas";
import { SCAN_SANDBOX_REPO_DIR } from "#/modules/scan-sandbox/constants";
import { DEFAULT_AGENT_FILES, type AgentFiles } from "#/modules/scan-sandbox/utils/agent-files";

const dropRepoClaudeConfig = ["/.claude", "/CLAUDE.md", "/CLAUDE.local.md", "/.mcp.json"].reduce(
  (command, name) => `${command} ${SCAN_SANDBOX_REPO_DIR}${name}`,
  "rm -rf",
);

// -----
// One run of the agent. A lite Scan has one run with the default files
// and its own cap. A Phase of a full Scan has files of its own and the
// allowance of that Phase as its cap.
// -----
export function buildAgentScript(options: ScanOptions, files: AgentFiles = DEFAULT_AGENT_FILES, maxBudgetUsd: number = options.maxBudgetUsd): string {
  const agent = [
    "claude --print --output-format json --dangerously-skip-permissions --no-session-persistence --setting-sources user",
    `--model ${options.model} --effort ${options.effort} --max-budget-usd ${maxBudgetUsd}`,
    `"$(cat ${files.prompt})"`,
  ].join(" ");
  return [
    `mkdir ${files.lock} 2>/dev/null || exit 0`,
    dropRepoClaudeConfig,
    `rm -f ${files.exit}`,
    `setsid nohup sh -c '${agent} > ${files.log} 2> ${files.err} < /dev/null; echo $? > ${files.exit}.tmp && mv ${files.exit}.tmp ${files.exit}' > /dev/null 2>&1 &`,
  ].join("; ");
}
