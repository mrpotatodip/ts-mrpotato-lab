// -----
// Messages. A refused pairing code always reads the
// same, so a guesser cannot tell a wrong code from an
// expired or used one.
// -----
export const RUNNER_PAIRING_INVALID = "This pairing code is invalid or has expired";
export const RUNNER_NOT_FOUND = "Runner not found";

// -----
// A pairing code is 8 characters from an alphabet with
// no 0, 1, I or O, shown as two groups of four. A token
// starts with a prefix, so a leaked one is easy to find.
// -----
export const RUNNER_PAIRING_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const RUNNER_PAIRING_CODE_LENGTH = 8;
export const RUNNER_TOKEN_PREFIX = "elr_";

// -----
// A Scan on a Runner. The agent works in a folder of the Runner's
// own, so the prompt names paths relative to it. The network rule
// differs from the container's: the agent itself must reach
// Anthropic, so it is told not to use the network, not that there
// is none.
// -----
// -----
// The cap a scan on a Runner carries. It is a safety net, not a
// price: the scan runs on the person's own Claude, so the agent's
// estimate at API prices is only for them to read, and the 40
// minute timeout in the Runner app is the real stop. The number
// is far above what that time can reach.
// -----
export const RUNNER_MAX_BUDGET_USD = 50;

export const RUNNER_PROMPT_PLACE = {
  repoDir: "./repo",
  outDir: "./out",
  priorPath: "./prior-findings.json",
  networkRule: "do not use the network",
  validatedBy: "runner",
} as const;
export const RUNNER_JOB_NOT_FOUND = "This scan is not waiting for a report from this runner";
export const RUNNER_JOB_PRIVATE = "A private repository can't run on a runner yet. Run it in EliseLAB's cloud.";
export const RUNNER_JOB_NOT_CONNECTED = "runner_id: this runner is not connected to the account";
export const RUNNER_JOB_NOT_PICKED_UP = "The runner did not pick up this scan in time. Check that the EliseLAB Runner app is open and connected on that computer.";
export const RUNNER_JOB_BAD_OPTIONS = "The scan's settings could not be read, so it was not run. Start a new scan.";
export const RUNNER_JOB_NO_REPORT ="the audit finished without writing REPORT.md";
