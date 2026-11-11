import { describe, expect, it } from "vitest";
import type { PlanState } from "#/modules/billing";
import { chargeOf, creditBalanceOf, holdOf, renewalGrantOf, settlementOf } from "#/modules/credit";

describe("chargeOf and holdOf", () => {
  it.each([
    [0.21, 1.5, 0.315],
    [0.015, 1.5, 0.0225],
    [1.1931, 1.5, 1.7897],
    [2, 1.5, 3],
  ])("a cost of %s at %sx takes %s", (cost, markup, expected) => {
    expect(chargeOf(cost, markup)).toBe(expected);
    expect(holdOf(cost, markup)).toBe(expected);
  });
});

describe("renewalGrantOf", () => {
  it.each([
    ["an empty balance", 0, 49, 100, 49],
    ["a balance with room for the whole grant", 51, 49, 100, 49],
    ["a balance that leaves room for part of it", 80, 49, 100, 20],
    ["a balance at the cap", 100, 49, 100, 0],
    ["a balance above the cap from topups", 130, 49, 100, 0],
    ["a plan with no cap", 500, 49, null, 49],
  ])("for %s the grant is correct", (_name, balance, grant, cap, expected) => {
    expect(renewalGrantOf(balance, grant, cap)).toBe(expected);
  });
});

describe("creditBalanceOf", () => {
  const plan: PlanState = {
    planKey: "pro",
    includedCreditUsd: 49,
    keySource: "platform",
    creditMarkup: 1.5,
    creditBalanceUsd: 41.25,
    monthlyScanAllowance: null,
    maxMembers: 5,
    status: "active",
    pastDueSince: null,
  };

  it("shows the plan, the balance and the month's scans", () => {
    expect(creditBalanceOf({ plan, scans: 12 })).toEqual({ planKey: "pro", keySource: "platform", balanceUsd: 41.25, monthlyCreditUsd: 49, scans: 12, scanAllowance: null });
  });

  it("shows an account with no plan as having no credit", () => {
    expect(creditBalanceOf({ plan: null, scans: 3 })).toEqual({ planKey: null, keySource: null, balanceUsd: 0, monthlyCreditUsd: 0, scans: 3, scanAllowance: null });
  });
});

describe("settlementOf", () => {
  it.each([
    ["a succeeded scan", "succeeded", 0.21, { ok: true, chargeUsd: 0.315 }],
    ["a failed scan that spent tokens", "failed", 0.4, { ok: true, chargeUsd: 0.6 }],
    ["a failed scan the meter never read", "failed", null, { ok: true, chargeUsd: 0 }],
    ["a succeeded scan the meter never read", "succeeded", null, { ok: false, reason: "missing_cost" }],
  ] as const)("for %s the settlement is correct", (_name, status, costUsd, expected) => {
    expect(settlementOf({ status, costUsd, markup: 1.5 })).toEqual(expected);
  });
});
