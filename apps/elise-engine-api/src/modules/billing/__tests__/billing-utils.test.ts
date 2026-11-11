import { describe, expect, it } from "vitest";
import { BILLING_GRACE_MS, scanBlockOf, type PlanState } from "#/modules/billing";

const NOW = new Date("2026-11-11T12:00:00Z");
const plan = (extra: Partial<PlanState>): PlanState => ({ planKey: "team", includedCreditUsd: 50, maxMembers: 10, status: "active", pastDueSince: null, ...extra });
const ago = (ms: number) => new Date(NOW.getTime() - ms);

describe("scanBlockOf", () => {
  it.each([
    ["no plan and billing not enforced", null, false, null],
    ["no plan and billing enforced", null, true, "NO_ACTIVE_PLAN"],
    ["an active plan", plan({}), true, null],
    ["a canceled plan, even when billing is not enforced", plan({ status: "canceled" }), false, "NO_ACTIVE_PLAN"],
    ["an incomplete plan", plan({ status: "incomplete" }), true, "NO_ACTIVE_PLAN"],
    ["an unpaid plan", plan({ status: "unpaid" }), true, "PAYMENT_FAILED"],
    ["a past due plan one second inside the grace period", plan({ status: "past_due", pastDueSince: ago(BILLING_GRACE_MS - 1000) }), true, null],
    ["a past due plan exactly at the end of the grace period", plan({ status: "past_due", pastDueSince: ago(BILLING_GRACE_MS) }), true, "PAYMENT_FAILED"],
    ["a past due plan with no start date", plan({ status: "past_due" }), true, null],
  ])("for %s the block is %s", (_name, subject, enforced, code) => {
    expect(scanBlockOf(subject, enforced, NOW)?.code ?? null).toBe(code);
  });
});
