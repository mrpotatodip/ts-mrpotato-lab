import type { ScanOptions } from "#/schemas";
import {
  SCAN_SANDBOX_AGENT_ERR,
  SCAN_SANDBOX_AGENT_EXIT,
  SCAN_SANDBOX_AGENT_LOCK,
  SCAN_SANDBOX_AGENT_LOG,
  SCAN_SANDBOX_PROMPT_PATH,
  SCAN_SANDBOX_REPO_DIR,
} from "#/modules/scan-sandbox/constants";

const dropRepoClaudeConfig = ["/.claude", "/CLAUDE.md", "/CLAUDE.local.md", "/.mcp.json"].reduce(
  (command, name) => `${command} ${SCAN_SANDBOX_REPO_DIR}${name}`,
  "rm -rf",
);

export function buildAgentScript(options: ScanOptions): string {
  const agent = [
    "claude --print --output-format json --dangerously-skip-permissions --no-session-persistence --setting-sources user",
    `--model ${options.model} --effort ${options.effort} --max-budget-usd ${options.maxBudgetUsd}`,
    `"$(cat ${SCAN_SANDBOX_PROMPT_PATH})"`,
  ].join(" ");
  return [
    `mkdir ${SCAN_SANDBOX_AGENT_LOCK} 2>/dev/null || exit 0`,
    dropRepoClaudeConfig,
    `rm -f ${SCAN_SANDBOX_AGENT_EXIT}`,
    `setsid nohup sh -c '${agent} > ${SCAN_SANDBOX_AGENT_LOG} 2> ${SCAN_SANDBOX_AGENT_ERR} < /dev/null; echo $? > ${SCAN_SANDBOX_AGENT_EXIT}.tmp && mv ${SCAN_SANDBOX_AGENT_EXIT}.tmp ${SCAN_SANDBOX_AGENT_EXIT}' > /dev/null 2>&1 &`,
  ].join("; ");
}
