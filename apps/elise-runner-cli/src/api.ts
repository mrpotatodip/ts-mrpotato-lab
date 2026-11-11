import { invoke } from "@tauri-apps/api/core";

// The shapes src-tauri/src/runner.rs sends. The page never holds the token: Rust keeps it
// in the keychain and makes the calls to EliseLAB.
export type RunnerStatus =
  | { state: "unpaired" }
  | { state: "revoked" }
  | { state: "offline" }
  | { state: "connected"; name: string; accountName: string };

export type RunnerErrorCode = "invalid_code" | "unreachable" | "keychain_failed";

export type RunnerResult = { ok: true; status: RunnerStatus } | { ok: false; code: RunnerErrorCode };

const ERROR_CODES: readonly RunnerErrorCode[] = ["invalid_code", "unreachable", "keychain_failed"];

const codeOf = (error: unknown): RunnerErrorCode => {
  const code = typeof error === "object" && error !== null && "code" in error ? error.code : undefined;
  return ERROR_CODES.find((known) => known === code) ?? "unreachable";
};

const settle = (call: Promise<RunnerStatus>): Promise<RunnerResult> =>
  call.then(
    (status): RunnerResult => ({ ok: true, status }),
    (error: unknown): RunnerResult => ({ ok: false, code: codeOf(error) }),
  );

// What the work loop is doing, as src-tauri/src/jobs.rs keeps it.
export type RunnerActivity = { state: "idle" } | { state: "running"; repo: string } | { state: "finished"; ok: boolean; repo: string; message: string };

export const runnerActivity = (): Promise<RunnerActivity> => invoke<RunnerActivity>("runner_activity");

export const runnerStatus = (): Promise<RunnerStatus> => invoke<RunnerStatus>("runner_status");

export const pairRunner = (code: string): Promise<RunnerResult> => settle(invoke<RunnerStatus>("pair_runner", { code }));

export const unpairRunner = (): Promise<RunnerResult> => settle(invoke<RunnerStatus>("unpair_runner"));
