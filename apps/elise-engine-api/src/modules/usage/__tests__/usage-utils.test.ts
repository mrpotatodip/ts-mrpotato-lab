import { describe, expect, it } from "vitest";
import type { ScanStatus } from "#/schemas";
import type { PlanState } from "#/modules/billing";
import type { MonthSpend, UsageEnv } from "#/modules/usage";
import { allowanceUsdOf, budgetUsdOf, defaultBudgetUsdOf, monthLabelOf, monthStartOf, reservedUsdOf, summarizeUsage } from "#/modules/usage";

const ENV: UsageEnv = { MONTHLY_BUDGET_USD: "20", BUDGET_ALLOWANCE_USD: "1000" };
const TEAM: PlanState = {
  planKey: "team",
  includedCreditUsd: 50,
  keySource: "platform",
  creditMarkup: 1.5,
  creditBalanceUsd: 50,
  monthlyScanAllowance: null,
  maxMembers: 10,
  status: "active",
  pastDueSince: null,
};

const spend: MonthSpend = {
  spentUsd: 4.5,
  platformSpentUsd: 4.5,
  platformReservedUsd: 0,
  ownKey: false,
  plan: null,
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

describe("defaultBudgetUsdOf", () => {
  it.each([
    ["no plan", null, 20],
    ["a plan", TEAM, 50],
  ])("with %s is %s", (_name, plan, expected) => {
    expect(defaultBudgetUsdOf({ ...spend, plan }, ENV)).toBe(expected);
  });
});

describe("budgetUsdOf", () => {
  it("falls back to the default", () => {
    expect(budgetUsdOf(spend, ENV)).toBe(20);
  });

  it("falls back to the plan's included credit when there is a plan", () => {
    expect(budgetUsdOf({ ...spend, plan: TEAM }, ENV)).toBe(50);
  });

  it("prefers the account's own budget", () => {
    expect(budgetUsdOf({ ...spend, budgetOverrideUsd: 50 }, ENV)).toBe(50);
  });

  it("lets a lowered allowance win over a budget set before it", () => {
    expect(budgetUsdOf({ ...spend, budgetOverrideUsd: 50, budgetAllowanceUsd: 30 }, ENV)).toBe(30);
  });
});

describe("allowanceUsdOf", () => {
  it.each([
    [null, 1000],
    [75, 75],
  ])("with %s on the account is %s", (allowance, expected) => {
    expect(allowanceUsdOf({ ...spend, budgetAllowanceUsd: allowance }, ENV)).toBe(expected);
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
    expect(summarizeUsage(new Date("2026-11-07T00:00:00Z"), spend, ENV, 2)).toEqual({
      month: "2026-11",
      budgetApplies: true,
      budgetUsd: 20,
      allowanceUsd: 1000,
      spentUsd: 4.5,
      reservedUsd: 2,
      remainingUsd: 13.5,
      scans: 6,
      tokens: spend.tokens,
    });
  });

  it.each([
    ["no plan and no own key", { plan: null, ownKey: false, budgetOverrideUsd: null }, true],
    ["no plan and an own key", { plan: null, ownKey: true, budgetOverrideUsd: null }, false],
    ["no plan, an own key and a budget an admin set", { plan: null, ownKey: true, budgetOverrideUsd: 10 }, true],
  ])("says whether the monthly budget applies with %s: %s", (_name, over, expected) => {
    expect(summarizeUsage(new Date("2026-11-07T00:00:00Z"), { ...spend, ...over }, ENV, 0).budgetApplies).toBe(expected);
  });

  it("goes negative when the month passed the budget", () => {
    expect(summarizeUsage(new Date("2026-11-07T00:00:00Z"), { ...spend, spentUsd: 25 }, ENV, 0).remainingUsd).toBe(-5);
  });
});
