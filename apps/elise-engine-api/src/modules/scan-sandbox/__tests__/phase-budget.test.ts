import { describe, expect, it } from "vitest";
import { SCAN_SANDBOX_FULL_PHASES, SCAN_SANDBOX_PHASE_SHARES } from "#/modules/scan-sandbox/constants";
import type { FullPhase, PhaseRecord } from "#/modules/scan-sandbox/types";
import { endedPhase, freshMeter, phaseAllowanceOf, phaseSliceOf, startedPhase, sumOrNull, withReserve } from "#/modules/scan-sandbox/utils";

const CAP = 2;

const meterWith = (spentUsd: number) => ({ ...freshMeter(0), spentUsd });
const record = (phase: FullPhase, allowanceUsd: number, startSpentUsd: number, spentUsd: number | null = null): PhaseRecord => ({ phase, allowanceUsd, startSpentUsd, spentUsd, exhausted: false });

describe("the slices of the Budget cap", () => {
  it("shares the cap 10, 55, 25 and 10 percent, and the shares add up to all of it", () => {
    expect(SCAN_SANDBOX_FULL_PHASES.map((phase) => phaseSliceOf(CAP, phase))).toEqual([0.2, 1.1, 0.5, 0.2]);
    expect(Object.values(SCAN_SANDBOX_PHASE_SHARES).reduce((sum, share) => sum + share, 0)).toBeCloseTo(1);
  });

  it.each([0.01, 0.07, 1, 3.333, 10.5])("never makes four slices worth more than the cap, at a cap of %s", (cap) => {
    const total = SCAN_SANDBOX_FULL_PHASES.reduce((sum, phase) => sum + phaseSliceOf(cap, phase), 0);
    expect(total).toBeLessThanOrEqual(cap);
  });
});

describe("what a Phase may spend, and the money that passes forward", () => {
  it("gives recon and report only their own slice", () => {
    expect(phaseAllowanceOf(CAP, "recon", {})).toBe(0.2);
    expect(phaseAllowanceOf(CAP, "report", {})).toBe(0.2);
  });

  it("passes what recon left to hunt, and what hunt left to check", () => {
    const afterRecon = { recon: 0.05 };
    expect(phaseAllowanceOf(CAP, "hunt", afterRecon)).toBeCloseTo(1.1 + 0.15);

    const afterHunt = { recon: 0.05, hunt: 0.9 };
    expect(phaseAllowanceOf(CAP, "check", afterHunt)).toBeCloseTo(0.5 + (1.1 + 0.15 - 0.9));
  });

  it("passes nothing forward from a Phase that spent its whole allowance, or a little over it with calls in flight", () => {
    expect(phaseAllowanceOf(CAP, "hunt", { recon: 0.2 })).toBe(1.1);
    expect(phaseAllowanceOf(CAP, "hunt", { recon: 0.2001 })).toBe(1.1);
    expect(phaseAllowanceOf(CAP, "check", { recon: 0.2, hunt: 1.1 })).toBe(0.5);
  });

  it("does not pass check's leftover to report: the report slice is fixed", () => {
    expect(phaseAllowanceOf(CAP, "report", { recon: 0, hunt: 0, check: 0 })).toBe(0.2);
    expect(phaseAllowanceOf(CAP, "report", { recon: 0.2, hunt: 1.1, check: 0.5 })).toBe(0.2);
  });

  it("never lets an earlier Phase use the report slice, even when every earlier Phase spends nothing", () => {
    const earlier: FullPhase[] = ["recon", "hunt", "check"];
    const reachable = earlier.reduce((sum, phase) => sum + phaseSliceOf(CAP, phase), 0);

    expect(phaseAllowanceOf(CAP, "check", { recon: 0, hunt: 0 })).toBeCloseTo(reachable);
    expect(reachable + phaseSliceOf(CAP, "report")).toBeLessThanOrEqual(CAP);
  });

  it("keeps the whole Scan under the cap when every Phase spends everything it may", () => {
    const spent: Partial<Record<FullPhase, number>> = {};
    for (const phase of SCAN_SANDBOX_FULL_PHASES) spent[phase] = phaseAllowanceOf(CAP, phase, spent);

    expect(Object.values(spent).reduce((sum, usd) => sum + usd, 0)).toBeLessThanOrEqual(CAP);
  });
});

describe("the meter when a Phase starts and ends", () => {
  it("caps a Phase at what the Scan has spent so far plus the Phase's allowance", () => {
    const first = startedPhase(CAP, "recon", [], freshMeter(0));
    expect(first.meter.budgetUsd).toBeCloseTo(0.2);

    const afterRecon = { ...first, meter: { ...first.meter, spentUsd: 0.05 }, records: endedPhase(first.records, "recon", meterWith(0.05)) };
    const second = startedPhase(CAP, "hunt", afterRecon.records, afterRecon.meter);
    expect(second.meter.budgetUsd).toBeCloseTo(0.05 + 1.25);
  });

  it("refuses a model call that would pass the Phase's cap, and so cannot spend the next Phase's money", () => {
    const hunting = startedPhase(CAP, "hunt", [record("recon", 0.2, 0, 0.2)], meterWith(0.2)).meter;

    expect(withReserve(hunting, 1.1)).not.toBeNull();
    expect(withReserve(hunting, 1.11)).toBeNull();
  });

  it("starts the next Phase with its own money after one spent its whole slice", () => {
    const records = [record("recon", 0.2, 0, 0.2), record("hunt", 1.1, 0.2, 1.1)];
    const checking = startedPhase(CAP, "check", records, meterWith(1.3)).meter;

    expect(checking.budgetUsd).toBeCloseTo(1.3 + 0.5);
    expect(checking.refused).toBe(false);
  });

  it("changes nothing when a launch is retried, so a running Phase is not given a fresh allowance", () => {
    const first = startedPhase(CAP, "recon", [], freshMeter(0));
    const retried = startedPhase(CAP, "recon", first.records, { ...first.meter, spentUsd: 0.1 });

    expect(retried.records).toEqual(first.records);
    expect(retried.meter.budgetUsd).toBe(first.meter.budgetUsd);
  });

  it("says a Phase spent its slice when the meter turned a call away, and what it spent", () => {
    const [ended] = endedPhase([record("hunt", 1.1, 0.2)], "hunt", { ...meterWith(1.3), refused: true });

    expect(ended).toMatchObject({ spentUsd: expect.closeTo(1.1), exhausted: true });
  });

  it("keeps the first answer for a Phase when its end is read again", () => {
    const once = endedPhase([record("hunt", 1.1, 0.2)], "hunt", meterWith(0.5));
    const twice = endedPhase(once, "hunt", meterWith(0.9));

    expect(twice).toEqual(once);
  });
});

describe("sumOrNull", () => {
  it.each([
    [[3, null, 4], 7],
    [[null, null], null],
    [[], null],
  ])("adds the numbers that are there in %j", (values, expected) => {
    expect(sumOrNull(values)).toBe(expected);
  });
});
