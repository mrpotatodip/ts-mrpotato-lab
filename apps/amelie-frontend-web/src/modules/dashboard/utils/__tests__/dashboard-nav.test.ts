import { describe, expect, it } from "vitest";

import { findDashboardNavItem, isDashboardNavActive } from "../dashboard-nav";

const ITEMS = [
  { to: "/admin", label: "Invite codes" },
  { to: "/admin/roles", label: "Roles" },
  { to: "/menu", label: "Items" },
] as const;

describe("isDashboardNavActive", () => {
  it("is active on its own path and below it", () => {
    expect(isDashboardNavActive("/menu", "/menu")).toBe(true);
    expect(isDashboardNavActive("/menu/123", "/menu")).toBe(true);
    expect(isDashboardNavActive("/menus", "/menu")).toBe(false);
  });

  it("keeps /admin to the invite codes page", () => {
    expect(isDashboardNavActive("/admin", "/admin")).toBe(true);
    expect(isDashboardNavActive("/admin/roles", "/admin")).toBe(false);
    expect(isDashboardNavActive("/admin/roles/abc", "/admin/roles")).toBe(true);
  });
});

describe("findDashboardNavItem", () => {
  it("names the screen by the longest matching path", () => {
    expect(findDashboardNavItem("/admin", ITEMS)?.label).toBe("Invite codes");
    expect(findDashboardNavItem("/admin/roles", ITEMS)?.label).toBe("Roles");
    expect(findDashboardNavItem("/admin/roles/abc", ITEMS)?.label).toBe("Roles");
  });

  it("finds nothing for an unknown path", () => {
    expect(findDashboardNavItem("/nowhere", ITEMS)).toBeUndefined();
  });
});
