import { describe, expect, it } from "vitest";
import {
  adminRoleBindingLocked,
  adminRoleDeleteBlocker,
  adminRoleDisableBlocker,
  adminRoleStatusLabel,
  adminRoleStatusTone,
  formatAdminPowerCount,
} from "../admin-role-status";

describe("admin role status", () => {
  it("names the state of each kind of role", () => {
    expect(adminRoleStatusLabel({ scope: "tenant", enabled: true })).toBe("Enabled");
    expect(adminRoleStatusLabel({ scope: "tenant", enabled: false })).toBe("Disabled");
    expect(adminRoleStatusLabel({ scope: "platform", enabled: true })).toBe("Platform");
    expect(adminRoleStatusTone({ scope: "tenant", enabled: true })).toBe("success");
    expect(adminRoleStatusTone({ scope: "tenant", enabled: false })).toBe("neutral");
  });

  it("says why a system or platform role cannot be disabled", () => {
    expect(adminRoleDisableBlocker({ scope: "tenant", isSystem: true })).toContain("system role");
    expect(adminRoleDisableBlocker({ scope: "platform", isSystem: true })).toContain("platform role");
    expect(adminRoleDisableBlocker({ scope: "tenant", isSystem: false })).toBeNull();
  });

  it("says why a system or held role cannot be deleted", () => {
    expect(adminRoleDeleteBlocker({ isSystem: true, holderCount: 0 })).toContain("system role");
    expect(adminRoleDeleteBlocker({ isSystem: false, holderCount: 1 })).toBe("1 person holds this role. Disable it instead.");
    expect(adminRoleDeleteBlocker({ isSystem: false, holderCount: 3 })).toBe("3 people hold this role. Disable it instead.");
    expect(adminRoleDeleteBlocker({ isSystem: false, holderCount: 0 })).toBeNull();
  });

  it("counts powers", () => {
    expect(formatAdminPowerCount(1)).toBe("1 power");
    expect(formatAdminPowerCount(0)).toBe("0 powers");
    expect(formatAdminPowerCount(68)).toBe("68 powers");
  });

  it("fixes the binding setting off for a system or platform role", () => {
    expect(adminRoleBindingLocked({ scope: "tenant", isSystem: true })).toBe("A system role is always cafe-wide.");
    expect(adminRoleBindingLocked({ scope: "platform", isSystem: true })).toBe("A platform role is always cafe-wide.");
    expect(adminRoleBindingLocked({ scope: "tenant", isSystem: false })).toBeNull();
  });
});
