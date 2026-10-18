import { describe, expect, it } from "vitest";
import { ACCESS_POWERS, BOUND_POWERS, hasAccessPower, isBoundPower, isAccessPower } from "@repo/contracts/amelie";

describe("AccessPower at runtime", () => {
  it("holds all 72 catalogue Powers", () => {
    expect(ACCESS_POWERS).toHaveLength(72);
    expect(new Set(ACCESS_POWERS).size).toBe(72);
  });

  it("recognises a real Power and refuses a misspelt one", () => {
    expect(isAccessPower("company:team:members:update")).toBe(true);
    expect(isAccessPower("company:team:members:updat")).toBe(false);
    expect(isAccessPower("company:team:members")).toBe(false);
  });

  it("marks exactly the Powers a binding limits", () => {
    const companyBound = [
      "company:profile:locations:create",
      "company:profile:locations:update",
      "company:profile:locations:archive",
      "company:profile:business_profile:update",
      "company:menu:locations:update",
      "company:faqs:faqs:create",
      "company:faqs:faqs:update",
      "company:faqs:faqs:delete",
    ];
    const stores = ACCESS_POWERS.filter((power) => power.startsWith("store:"));
    expect(BOUND_POWERS.toSorted()).toEqual([...stores, ...companyBound].toSorted());
    expect(isBoundPower("store:hours:weekly:update")).toBe(true);
    expect(isBoundPower("company:profile:locations:read")).toBe(false);
    expect(isBoundPower("company:team:members:update")).toBe(false);
  });

  it("checks a grant list for a Power exactly", () => {
    expect(hasAccessPower(["company:team:members:update"], "company:team:members:update")).toBe(true);
    expect(hasAccessPower(["company:team:members:read"], "company:team:members:update")).toBe(false);
  });
});
