import {
  SCAN_SANDBOX_AGENT_ERR,
  SCAN_SANDBOX_AGENT_EXIT,
  SCAN_SANDBOX_AGENT_LOCK,
  SCAN_SANDBOX_AGENT_LOG,
  SCAN_SANDBOX_PROMPT_PATH,
  SCAN_SANDBOX_WORK_DIR,
} from "#/modules/scan-sandbox/constants";
import type { FullPhase } from "#/modules/scan-sandbox/types";

// -----
// The files of one run of the agent in the container: the prompt it
// reads, the log and error it writes, the file that holds its exit
// code, and the lock that stops a retry from starting a second agent.
// -----
export type AgentFiles = { prompt: string; log: string; err: string; exit: string; lock: string };

export const DEFAULT_AGENT_FILES: AgentFiles = {
  prompt: SCAN_SANDBOX_PROMPT_PATH,
  log: SCAN_SANDBOX_AGENT_LOG,
  err: SCAN_SANDBOX_AGENT_ERR,
  exit: SCAN_SANDBOX_AGENT_EXIT,
  lock: SCAN_SANDBOX_AGENT_LOCK,
};

// -----
// A Phase has files of its own, so a later Phase never reads the exit
// code of an earlier one and each Phase's log stays to read.
// -----
export const phaseAgentFiles = (phase: FullPhase): AgentFiles => ({
  prompt: `${SCAN_SANDBOX_WORK_DIR}/prompt-${phase}.txt`,
  log: `${SCAN_SANDBOX_WORK_DIR}/agent-${phase}.log`,
  err: `${SCAN_SANDBOX_WORK_DIR}/agent-${phase}.err`,
  exit: `${SCAN_SANDBOX_WORK_DIR}/agent-${phase}.exit`,
  lock: `${SCAN_SANDBOX_WORK_DIR}/agent-${phase}.lock`,
});
