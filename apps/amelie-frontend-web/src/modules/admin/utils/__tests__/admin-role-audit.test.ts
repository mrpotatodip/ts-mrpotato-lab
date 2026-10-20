import { describe, expect, it } from "vitest";
import type { AdminAuditEntry } from "@repo/contracts/amelie";
import { describeAdminAuditEntry } from "../admin-role-audit";

const entry = (action: string, before: AdminAuditEntry["before"], after: AdminAuditEntry["after"]): AdminAuditEntry => ({
  id: "2b5b4b0e-9f5e-4a53-9a5e-6f1d0b9a0c11",
  actorEmail: "boss@amelie.test",
  action,
  subjectId: "9a1b2c3d-4e5f-4a6b-8c7d-0e1f2a3b4c5d",
  before,
  after,
  createdAt: "2026-10-17T00:00:00.000Z",
});

const summary = { key: "shift_lead", label: "Shift lead", description: null, enabled: false };

describe("describeAdminAuditEntry", () => {
  it("names a created and a deleted role", () => {
    expect(describeAdminAuditEntry(entry("role.created", null, summary))).toEqual({
      title: 'Created "Shift lead"',
      details: [],
    });
    expect(describeAdminAuditEntry(entry("role.deleted", summary, null)).title).toBe('Deleted "Shift lead"');
  });

  it("lists what an edit changed", () => {
    const after = { ...summary, label: "Shift leader", description: "Runs a shift" };

    expect(describeAdminAuditEntry(entry("role.updated", summary, after))).toEqual({
      title: "Role edited",
      details: ['Label: "Shift lead" to "Shift leader"', "Description changed"],
    });
  });

  it("describes enabling and disabling", () => {
    expect(describeAdminAuditEntry(entry("role.enabled", { enabled: false }, { enabled: true })).title).toBe(
      "Enabled for every cafe",
    );
    expect(describeAdminAuditEntry(entry("role.disabled", { enabled: true }, { enabled: false })).title).toBe(
      "Disabled: no new assignments",
    );
  });

  it("lists the powers added and removed", () => {
    const result = describeAdminAuditEntry(
      entry("role.powers_set", { powers: ["a:x:read", "b:x:read"] }, { powers: ["b:x:read", "c:x:read"] }),
    );

    expect(result).toEqual({
      title: "Powers changed: 1 added, 1 removed",
      details: ["+ c:x:read", "- a:x:read"],
    });
  });

  it("falls back to the action when the payload is not what it expects", () => {
    expect(describeAdminAuditEntry(entry("role.powers_set", null, "nope")).title).toBe("Powers changed");
    expect(describeAdminAuditEntry(entry("role.created", null, 5)).title).toBe("Created");
    expect(describeAdminAuditEntry(entry("role.something_new", null, null)).title).toBe("role.something_new");
  });

  it("says which way the binding setting went", () => {
    expect(
      describeAdminAuditEntry(entry("role.can_be_bound_set", { canBeBound: false }, { canBeBound: true })),
    ).toEqual({ title: "Members can now be limited to a Country or Location", details: [] });
    expect(
      describeAdminAuditEntry(entry("role.can_be_bound_set", { canBeBound: true }, { canBeBound: false })),
    ).toEqual({ title: "Members can no longer be limited to a Country or Location", details: [] });
  });
});
