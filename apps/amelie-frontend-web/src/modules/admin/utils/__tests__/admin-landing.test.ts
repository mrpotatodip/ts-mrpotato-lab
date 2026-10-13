import { describe, expect, it } from "vitest";
import { resolveAdminLanding } from "../admin-landing";

describe("resolveAdminLanding", () => {
  it("sends a superuser with no cafe straight to /admin", () => {
    expect(resolveAdminLanding({ isSuperuser: true, cafeCount: 0 })).toBe("/admin");
  });

  it("sends a superuser with a cafe to /overview", () => {
    expect(resolveAdminLanding({ isSuperuser: true, cafeCount: 2 })).toBe("/overview");
  });

  it("sends a login with no cafe and no superuser role to the no-cafe page", () => {
    expect(resolveAdminLanding({ isSuperuser: false, cafeCount: 0 })).toBe("/no-cafe");
  });

  it("sends a cafe member to /overview", () => {
    expect(resolveAdminLanding({ isSuperuser: false, cafeCount: 1 })).toBe("/overview");
  });
});
