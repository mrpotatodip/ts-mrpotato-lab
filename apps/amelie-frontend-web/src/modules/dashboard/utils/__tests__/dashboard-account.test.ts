import { describe, expect, it } from "vitest";

import {
  DASHBOARD_PLAN_LABEL,
  dashboardAccountInitials,
  dashboardAccountSubtitle,
  dashboardRoleLabel,
} from "../dashboard-account";

describe("dashboardRoleLabel", () => {
  it("capitalises the cafe role", () => {
    expect(dashboardRoleLabel("owner")).toBe("Owner");
    expect(dashboardRoleLabel("manager")).toBe("Manager");
    expect(dashboardRoleLabel("staff")).toBe("Staff");
    expect(dashboardRoleLabel(null)).toBeNull();
  });
});

describe("dashboardAccountSubtitle", () => {
  it("names the role and the plan when the login has a cafe", () => {
    expect(dashboardAccountSubtitle({ role: "owner", isSuperuser: false })).toBe(`Owner · ${DASHBOARD_PLAN_LABEL}`);
  });

  it("names Superuser when there is no cafe role", () => {
    expect(dashboardAccountSubtitle({ role: null, isSuperuser: true })).toBe("Superuser");
  });

  it("falls back to the plan alone", () => {
    expect(dashboardAccountSubtitle({ role: null, isSuperuser: false })).toBe(DASHBOARD_PLAN_LABEL);
  });
});

describe("dashboardAccountInitials", () => {
  it("uses the first and last names", () => {
    expect(dashboardAccountInitials("Ada Lovelace")).toBe("AL");
  });

  it("uses two letters from a single name", () => {
    expect(dashboardAccountInitials("Ada")).toBe("AD");
  });

  it("uses a mark when the name is blank", () => {
    expect(dashboardAccountInitials("  ")).toBe("?");
  });
});
