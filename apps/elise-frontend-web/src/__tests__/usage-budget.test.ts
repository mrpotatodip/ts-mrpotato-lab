import { describe, expect, it } from "vitest";
import { usageBlockedNote, usageBudgetError, usageBudgetFloorUsd, usageBudgetLabel, usageChangedAt } from "#/modules/usage/utils/usage-format";

describe("usageBudgetLabel", () => {
  it.each([
    [null, "the default"],
    [30, "$30.00"],
  ])("writes %s as %s", (value, expected) => {
    expect(usageBudgetLabel(value)).toBe(expected);
  });
});

describe("usageChangedAt", () => {
  it("writes the moment in UTC", () => {
    expect(usageChangedAt("2026-11-11T09:40:00.000Z")).toBe("Nov 11, 2026, 09:40 UTC");
  });

  it("gives back text that is not a date", () => {
    expect(usageChangedAt("not a date")).toBe("not a date");
  });
});

describe("usageBudgetFloorUsd", () => {
  it("rounds what the month has committed up to the cent", () => {
    expect(usageBudgetFloorUsd(4.501, 2)).toBe(6.51);
  });
});

describe("usageBlockedNote", () => {
  it("blames the running scans when they hold the budget and money is still unspent", () => {
    expect(usageBlockedNote({ budgetUsd: 49, spentUsd: 4.27, reservedUsd: 50 })).toContain("Running scans hold $50.00 of this month's $49.00 budget");
  });

  it.each([
    [{ budgetUsd: 49, spentUsd: 49, reservedUsd: 0 }],
    [{ budgetUsd: 49, spentUsd: 60, reservedUsd: 10 }],
  ])("says the budget is spent when spending alone reaches it: %j", (usage) => {
    expect(usageBlockedNote(usage)).toContain("budget is spent");
  });
});

describe("usageBudgetError", () => {
  it.each([
    ["25", undefined],
    [" 25.5 ", undefined],
    ["5", undefined],
    ["100", undefined],
  ])("accepts %s between $5 and $100", (input, expected) => {
    expect(usageBudgetError(input, 5, 100)).toBe(expected);
  });

  it.each([
    ["", "Enter a dollar amount"],
    ["twenty", "Enter a dollar amount"],
    ["12.345", "Enter a dollar amount"],
    ["-4", "Enter a dollar amount"],
    ["4.99", "At least $5.00"],
    ["100.01", "At most $100.00"],
  ])("refuses %j", (input, message) => {
    expect(usageBudgetError(input, 5, 100)).toContain(message);
  });

  it("has no upper bound until the engine reports an allowance", () => {
    expect(usageBudgetError("5000", 5, undefined)).toBeUndefined();
  });
});
