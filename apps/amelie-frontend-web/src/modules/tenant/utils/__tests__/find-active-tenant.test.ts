import { describe, expect, it } from "vitest";
import { findActiveTenant } from "../find-active-tenant";

const cafe = (id: string) => ({ id, name: `Cafe ${id}` });

describe("findActiveTenant", () => {
  it("finds the cafe the list names as active", () => {
    const list = { tenants: [cafe("a"), cafe("b")], activeTenantId: "b" };
    expect(findActiveTenant(list)?.id).toBe("b");
  });

  it("is null while nothing is loaded", () => {
    expect(findActiveTenant(undefined)).toBeNull();
  });

  it("is null when no cafe is active", () => {
    expect(findActiveTenant({ tenants: [], activeTenantId: null })).toBeNull();
  });
});
