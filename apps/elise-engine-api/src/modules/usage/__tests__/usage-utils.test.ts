import { describe, expect, it } from "vitest";
import type { ScanStatus } from "#/schemas";
import type { MonthSpend } from "#/modules/usage";
import { allowanceUsdOf, budgetUsdOf, monthLabelOf, monthStartOf, reservedUsdOf, summarizeUsage } from "#/modules/usage";

const spend: MonthSpend = {
  spentUsd: 4.5,
  scans: 6,
  tokens: { input: 10, output: 20, cacheRead: 30, cacheWrite: 40 },
  budgetOverrideUsd: null,
  budgetAllowanceUsd: null,
};

describe("month", () => {
  it("starts at midnight UTC on the first day", () => {
    expect(monthStartOf(new Date("2026-11-30T23:59:59Z")).toISOString()).toBe("2026-11-01T00:00:00.000Z");
  });

  it("is labelled year and month", () => {
    expect(monthLabelOf(new Date("2026-01-15T00:00:00Z"))).toBe("2026-01");
  });
});

describe("budgetUsdOf", () => {
  it("falls back to the default", () => {
    expect(budgetUsdOf(spend, "20")).toBe(20);
  });

  it("prefers the account's own budget", () => {
    expect(budgetUsdOf({ ...spend, budgetOverrideUsd: 50 }, "20")).toBe(50);
  });

  it("lets a lowered allowance win over a budget set before it", () => {
    expect(budgetUsdOf({ ...spend, budgetOverrideUsd: 50, budgetAllowanceUsd: 30 }, "20")).toBe(30);
  });
});

describe("allowanceUsdOf", () => {
  it.each([
    [null, 20],
    [75, 75],
  ])("with %s on the account is %s", (allowance, expected) => {
    expect(allowanceUsdOf({ ...spend, budgetAllowanceUsd: allowance }, "20")).toBe(expected);
  });
});

describe("reservedUsdOf", () => {
  it("adds the cap of each running scan", () => {
    // SAFETY: the sum reads only maxBudgetUsd.
    const running = [{ maxBudgetUsd: 2 }, { maxBudgetUsd: 1.5 }] as ScanStatus[];
    expect(reservedUsdOf(running)).toBe(3.5);
  });
});

describe("summarizeUsage", () => {
  it("subtracts what was spent and reserved from the budget", () => {
    expect(summarizeUsage(new Date("2026-11-07T00:00:00Z"), spend, "20", 2)).toEqual({
      month: "2026-11",
      budgetUsd: 20,
      allowanceUsd: 20,
      spentUsd: 4.5,
      reservedUsd: 2,
      remainingUsd: 13.5,
      scans: 6,
      tokens: spend.tokens,
    });
  });

  it("goes negative when the month passed the budget", () => {
    expect(summarizeUsage(new Date("2026-11-07T00:00:00Z"), { ...spend, spentUsd: 25 }, "20", 0).remainingUsd).toBe(-5);
  });
});
