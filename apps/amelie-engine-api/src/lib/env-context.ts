import type { Bindings } from "#/types/variables";

// -----
// Workers has no process.env — bindings only arrive as the `env`
// argument of each entrypoint (fetch/scheduled/queue). These values
// are static per deployment (identical for every concurrent request
// this Worker serves), so capturing them once per entrypoint call is
// safe and lets deep modules like api-client read config without env
// threaded through every call site.
// -----
let currentEnv: Bindings | undefined;

export function setEnvContext(env: Bindings): void {
  currentEnv = env;
}

export function getEnvContext(): Bindings {
  if (!currentEnv) {
    throw new Error("Env context accessed before it was set");
  }
  return currentEnv;
}
