import { describe, expect, it } from "vitest";
import { CreateAdminRoleBodySchema } from "@repo/contracts/amelie";
import { toCreateAdminRoleBody, toUpdateAdminRoleBody } from "../admin-role-form";

describe("toCreateAdminRoleBody", () => {
  it("trims the fields and turns a blank description into null", () => {
    expect(toCreateAdminRoleBody({ label: "  Shift lead ", key: " shift_lead ", description: "  " })).toEqual({
      key: "shift_lead",
      label: "Shift lead",
      description: null,
    });
  });

  it("keeps a description", () => {
    expect(toCreateAdminRoleBody({ label: "A", key: "ab", description: " Runs a shift " }).description).toBe(
      "Runs a shift",
    );
  });

  it("builds a body the contract accepts, and rejects a bad key", () => {
    const good = toCreateAdminRoleBody({ label: "Shift lead", key: "shift_lead", description: "" });
    const bad = toCreateAdminRoleBody({ label: "Shift lead", key: "Shift Lead", description: "" });

    expect(CreateAdminRoleBodySchema.safeParse(good).success).toBe(true);
    expect(CreateAdminRoleBodySchema.safeParse(bad).success).toBe(false);
  });
});

describe("toUpdateAdminRoleBody", () => {
  it("trims, and clears a description that was emptied", () => {
    expect(toUpdateAdminRoleBody({ label: " Shift leader ", description: "" })).toEqual({
      label: "Shift leader",
      description: null,
    });
  });
});
