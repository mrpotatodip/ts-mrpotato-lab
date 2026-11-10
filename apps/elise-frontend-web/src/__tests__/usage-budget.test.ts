import { describe, expect, it } from "vitest";
import { usageBudgetError, usageBudgetFloorUsd } from "#/modules/usage/utils/usage-format";

describe("usageBudgetFloorUsd", () => {
  it("rounds what the month has committed up to the cent", () => {
    expect(usageBudgetFloorUsd(4.501, 2)).toBe(6.51);
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
