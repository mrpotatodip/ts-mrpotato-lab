import { describe, expect, it } from "vitest";

import {
  DASHBOARD_PLAN_LABEL,
  dashboardAccountInitials,
  dashboardAccountSubtitle,
} from "../dashboard-account";

describe("dashboardAccountSubtitle", () => {
  it("names the role and the plan when the login has a cafe", () => {
    expect(dashboardAccountSubtitle({ roleLabel: "Tenant admin", isSuperuser: false })).toBe(
      `Tenant admin · ${DASHBOARD_PLAN_LABEL}`,
    );
  });

  it("names Superuser when there is no cafe role", () => {
    expect(dashboardAccountSubtitle({ roleLabel: null, isSuperuser: true })).toBe("Superuser");
  });

  it("falls back to the plan alone", () => {
    expect(dashboardAccountSubtitle({ roleLabel: null, isSuperuser: false })).toBe(DASHBOARD_PLAN_LABEL);
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
