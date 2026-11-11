import type { Effect } from "effect";
import type { DbError } from "#/lib/effect-query";

// -----
// What closing a scan's credit needs from the scan: its end state
// and the cost the meter read, null when it read nothing.
// -----
export type SettlementInput = { status: "succeeded" | "failed"; costUsd: number | null; markup: number };

// -----
// The charge a scan takes from the balance, or why there is none.
// A succeeded scan with no cost is a meter that failed: charging it
// as free would give the work away, so the caller must stop.
// -----
export type Settlement = { ok: true; chargeUsd: number } | { ok: false; reason: "missing_cost" };

export type HoldResult = { held: boolean; balanceUsd: number };

// -----
// Takes the credit a new scan may spend. The scan service gets it
// from its caller, so a test can stand one in.
// -----
export type HoldCredit = (scanId: string, holdUsd: number) => Effect.Effect<HoldResult, DbError>;
export type SettleResult = { settled: boolean; chargeUsd: number };
export type RenewResult = { grantedUsd: number; duplicate: boolean };
