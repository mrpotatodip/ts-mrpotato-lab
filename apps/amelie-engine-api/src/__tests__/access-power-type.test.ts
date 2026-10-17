import { describe, expect, it } from "vitest";
import { ACCESS_POWERS, hasAccessPower, isAccessPower } from "@repo/contracts/amelie";

describe("AccessPower at runtime", () => {
  it("holds all 71 catalogue Powers", () => {
    expect(ACCESS_POWERS).toHaveLength(71);
    expect(new Set(ACCESS_POWERS).size).toBe(71);
  });

  it("recognises a real Power and refuses a misspelt one", () => {
    expect(isAccessPower("company:team:members:update")).toBe(true);
    expect(isAccessPower("company:team:members:updat")).toBe(false);
    expect(isAccessPower("company:team:members")).toBe(false);
  });

  it("checks a grant list for a Power exactly", () => {
    expect(hasAccessPower(["company:team:members:update"], "company:team:members:update")).toBe(true);
    expect(hasAccessPower(["company:team:members:read"], "company:team:members:update")).toBe(false);
  });
});
