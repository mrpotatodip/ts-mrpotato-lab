import type { ScanPath } from "#/lib/scan-path";
import type { ActiveCounts } from "#/modules/scan-ledger";
import type { CreateScanEnv } from "#/modules/scans/types";

export type ScanRefusal = { code: "TOO_MANY_ACTIVE_SCANS" | "SCAN_WORKER_BUSY"; message: string };

// -----
// The path's own count of live Scans for one Account. A lite Scan and a
// full Scan each count only against their own path, so an Account at its
// full limit can still start a lite Scan and the other way round.
// -----
export const accountLimitOf = (env: Pick<CreateScanEnv, "MAX_ACTIVE_SCANS" | "MAX_ACTIVE_FULL_SCANS">, path: ScanPath): number =>
  Number(path === "full" ? env.MAX_ACTIVE_FULL_SCANS : env.MAX_ACTIVE_SCANS);

export const globalLimitOf = (env: Pick<CreateScanEnv, "MAX_GLOBAL_LITE_SCANS" | "MAX_GLOBAL_FULL_SCANS">, path: ScanPath): number =>
  Number(path === "full" ? env.MAX_GLOBAL_FULL_SCANS : env.MAX_GLOBAL_LITE_SCANS);

// -----
// Why a new Scan may not start now, or null. The Account's own count is
// checked first: it is the answer a person can act on. A Scan that meets
// a global cap is refused, not queued: a queue would hide a wait
// the person cannot see and cannot cancel. A Scan on a Runner holds no
// Sandbox of ours, so it passes null for the global counts and meets no
// global cap.
// -----
export const scanRefusalOf = (
  env: CreateScanEnv,
  path: ScanPath,
  accountActive: number,
  globalActive: ActiveCounts | null,
): ScanRefusal | null => {
  const accountLimit = accountLimitOf(env, path);
  if (accountActive >= accountLimit) {
    return { code: "TOO_MANY_ACTIVE_SCANS", message: `This account already has ${accountActive} active ${path} scans (limit ${accountLimit})` };
  }
  if (globalActive !== null && globalActive[path] >= globalLimitOf(env, path)) {
    return { code: "SCAN_WORKER_BUSY", message: `EliseLAB is busy with ${path} scans right now. Try again in a few minutes.` };
  }
  return null;
};
