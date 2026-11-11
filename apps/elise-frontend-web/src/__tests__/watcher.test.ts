import { describe, expect, it } from "vitest";
import { ACCESS_ROLE_GRANTS, isWatcher } from "@repo/contracts/elise";

describe("isWatcher", () => {
  it.each([
    { name: "the Watcher role", powers: ACCESS_ROLE_GRANTS.workspace_watcher, expected: true },
    { name: "a Workspace member", powers: ACCESS_ROLE_GRANTS.workspace_member, expected: false },
    { name: "a Workspace admin", powers: ACCESS_ROLE_GRANTS.workspace_admin, expected: false },
    { name: "the account owner", powers: ACCESS_ROLE_GRANTS.tenant_admin, expected: false },
    { name: "an account whose engine grants neither Power yet", powers: ["company:team:members:read"], expected: false },
    { name: "no Powers at all", powers: [], expected: false },
  ] as const)("is $expected for $name", ({ powers, expected }) => {
    expect(isWatcher(powers)).toBe(expected);
  });

  it("gives the Dashboard Power to every role but the Watcher", () => {
    const withDashboard = Object.entries(ACCESS_ROLE_GRANTS)
      .filter(([, powers]) => powers.some((power) => power === "company:dashboard:read"))
      .map(([role]) => role);

    expect(withDashboard).toEqual(["tenant_admin", "workspace_admin", "workspace_member"]);
  });
});
