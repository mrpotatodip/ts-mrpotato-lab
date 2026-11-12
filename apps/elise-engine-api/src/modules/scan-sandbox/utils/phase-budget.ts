import { SCAN_SANDBOX_FULL_PHASES, SCAN_SANDBOX_PHASE_SHARES } from "#/modules/scan-sandbox/constants";
import type { FullPhase, Meter, PhaseRecord, PhaseState } from "#/modules/scan-sandbox/types";

// -----
// What each finished Phase spent. A Phase that has not run has no entry.
// -----
export type PhaseSpend = Partial<Record<FullPhase, number>>;

const toMicroUsd = (usd: number): number => Math.floor(usd * 1e6) / 1e6;

// -----
// A Phase's own share of the Budget cap, rounded down so the four
// slices never add up to more than the cap.
// -----
export const phaseSliceOf = (capUsd: number, phase: FullPhase): number => toMicroUsd(capUsd * SCAN_SANDBOX_PHASE_SHARES[phase]);

// -----
// What a Phase may spend. Recon and report have only their slice. Money
// left unspent after recon goes to hunt, and money left after hunt goes
// to check, so a cheap Phase never wastes its slice. The report slice is
// fixed: it never gives money to an earlier Phase and never takes from
// one, so a Scan that spent everything hunting and checking still has
// money to write its Report. Unspent check money is not passed on.
// -----
export const phaseAllowanceOf = (capUsd: number, phase: FullPhase, spent: PhaseSpend): number => {
  const slice = phaseSliceOf(capUsd, phase);
  if (phase === "hunt") return slice + Math.max(0, phaseAllowanceOf(capUsd, "recon", spent) - (spent.recon ?? 0));
  if (phase === "check") return slice + Math.max(0, phaseAllowanceOf(capUsd, "hunt", spent) - (spent.hunt ?? 0));
  return slice;
};

export const isFullPhase = (name: string): name is FullPhase => SCAN_SANDBOX_FULL_PHASES.some((phase) => phase === name);

export const spendOfPhases = (records: PhaseRecord[]): PhaseSpend =>
  Object.fromEntries(records.flatMap((record) => (record.spentUsd === null ? [] : [[record.phase, record.spentUsd] as const])));

// -----
// The sum of the numbers that are there, or null when none is: a run
// that reported no turns has no turns, not zero.
// -----
export const sumOrNull = (values: (number | null)[]): number | null =>
  values.some((value) => value !== null) ? values.reduce<number>((sum, value) => sum + (value ?? 0), 0) : null;

export const freshMeter =(budgetUsd: number): Meter => ({
  budgetUsd,
  spentUsd: 0,
  reservedUsd: 0,
  inputTokens: 0,
  outputTokens: 0,
  cacheReadTokens: 0,
  cacheWriteTokens: 0,
});

// -----
// The meter and the Phase records when a Phase starts. The meter keeps
// one running total of what was spent, so the cap for this Phase is what
// has been spent so far plus the Phase's allowance: it can spend its
// allowance and no more, and the Scan's total can never pass the cap
// (apart from the calls in flight, which the reserve already holds back).
// A launch that is retried finds its record and changes nothing: a retry
// must not give a running Phase a fresh allowance.
// -----
export const startedPhase = (capUsd: number, phase: FullPhase, records: PhaseRecord[], meter: Meter): PhaseState => {
  if (records.some((record) => record.phase === phase)) return { meter, records };
  const allowanceUsd = phaseAllowanceOf(capUsd, phase, spendOfPhases(records));
  return {
    meter: { ...meter, budgetUsd: meter.spentUsd + allowanceUsd, refused: false },
    records: [...records, { phase, allowanceUsd, startSpentUsd: meter.spentUsd, spentUsd: null, exhausted: false }],
  };
};

// -----
// A Phase's records when it ends: what it spent, and whether the meter
// turned a call away. The first answer stays: a retry of the end step
// reads the same numbers.
// -----
export const endedPhase = (records: PhaseRecord[], phase: FullPhase, meter: Meter): PhaseRecord[] =>
  records.map((record) =>
    record.phase !== phase || record.spentUsd !== null ? record : { ...record, spentUsd: Math.max(0, meter.spentUsd - record.startSpentUsd), exhausted: meter.refused === true },
  );
