import type { ScanOptions } from "#/schemas";
import {
  SCAN_SANDBOX_AGENT_EXIT,
  SCAN_SANDBOX_AGENT_LOCK,
  SCAN_SANDBOX_AGENT_LOG,
  SCAN_SANDBOX_PROMPT_PATH,
} from "#/modules/scan-sandbox/constants";

export function buildAgentScript(options: ScanOptions): string {
  const agent = [
    "claude --print --dangerously-skip-permissions --no-session-persistence",
    `--model ${options.model} --effort ${options.effort} --max-budget-usd ${options.maxBudgetUsd}`,
    `"$(cat ${SCAN_SANDBOX_PROMPT_PATH})"`,
  ].join(" ");
  return [
    `mkdir ${SCAN_SANDBOX_AGENT_LOCK} 2>/dev/null || exit 0`,
    `rm -f ${SCAN_SANDBOX_AGENT_EXIT}`,
    `setsid nohup sh -c '${agent} > ${SCAN_SANDBOX_AGENT_LOG} 2>&1 < /dev/null; echo $? > ${SCAN_SANDBOX_AGENT_EXIT}.tmp && mv ${SCAN_SANDBOX_AGENT_EXIT}.tmp ${SCAN_SANDBOX_AGENT_EXIT}' > /dev/null 2>&1 &`,
  ].join("; ");
}
