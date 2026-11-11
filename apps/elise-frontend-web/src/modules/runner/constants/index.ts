// -----
// How often the list asks again while a pairing code is waiting.
// -----
export const RUNNER_WAITING_POLL_MS = 4_000;

// -----
// What the person reads for each state of a Runner. Raw values
// (`waiting`) are never labels.
// -----
export const RUNNER_STATE_COPY = {
  waiting: { label: "Waiting for pairing", variant: "info" },
  expired: { label: "Code expired", variant: "neutral" },
  connected: { label: "Connected", variant: "success" },
} as const;
