import { describe, expect, it } from "vitest";
import { ACCESS_POWERS } from "@repo/contracts/amelie";
import {
  adminPowerChanges,
  allAdminPowers,
  applyAdminPowerEdits,
  isAdminPowerChecked,
  toAdminPowerGroups,
  withAdminPowerEdit,
  withAdminPowersEdit,
} from "../admin-role-powers";

describe("toAdminPowerGroups", () => {
  it("lists every tenant Power once, and no platform Power", () => {
    const powers = allAdminPowers(toAdminPowerGroups("tenant"));

    expect(powers.toSorted()).toEqual(ACCESS_POWERS.filter((power) => !power.startsWith("platform:")).toSorted());
  });

  it("lists only platform Powers for a platform role", () => {
    const powers = allAdminPowers(toAdminPowerGroups("platform"));

    expect(powers.toSorted()).toEqual(ACCESS_POWERS.filter((power) => power.startsWith("platform:")).toSorted());
  });

  it("groups by the top of the tree and names sections below it", () => {
    const groups = toAdminPowerGroups("tenant");

    expect(groups.map((group) => group.label)).toEqual(["Company", "Store", "Integration"]);
    const profile = groups[0].sections.find((section) => section.path === "company:profile:business_profile");
    expect(profile).toEqual({
      path: "company:profile:business_profile",
      label: "Profile › Business profile",
      options: [
        { power: "company:profile:business_profile:read", action: "read" },
        { power: "company:profile:business_profile:update", action: "update" },
      ],
    });
  });
});

describe("power edits", () => {
  const saved = ["company:menu:items:read", "company:menu:items:update"];

  it("reads a box from the edit first, then from the saved list", () => {
    expect(isAdminPowerChecked(saved, {}, "company:menu:items:read")).toBe(true);
    expect(isAdminPowerChecked(saved, { "company:menu:items:read": false }, "company:menu:items:read")).toBe(false);
    expect(isAdminPowerChecked(saved, { "faq:x:read": true }, "faq:x:read")).toBe(true);
  });

  it("records only a difference from the saved list", () => {
    const unchecked = withAdminPowerEdit(saved, {}, "company:menu:items:read", false);
    const checkedNew = withAdminPowerEdit(saved, unchecked, "company:faqs:faqs:read", true);

    expect(checkedNew).toEqual({ "company:menu:items:read": false, "company:faqs:faqs:read": true });
  });

  it("leaves no trace when a box goes back to its saved state", () => {
    const unchecked = withAdminPowerEdit(saved, {}, "company:menu:items:read", false);

    expect(withAdminPowerEdit(saved, unchecked, "company:menu:items:read", true)).toEqual({});
    expect(withAdminPowerEdit(saved, {}, "company:menu:items:read", true)).toEqual({});
  });

  it("changes a whole section at once", () => {
    const section = ["company:menu:items:read", "company:menu:items:create"];

    expect(withAdminPowersEdit(saved, {}, section, true)).toEqual({ "company:menu:items:create": true });
    expect(withAdminPowersEdit(saved, {}, section, false)).toEqual({ "company:menu:items:read": false });
  });

  it("applies the edits to the saved list, sorted", () => {
    const edits = { "company:menu:items:read": false, "company:faqs:faqs:read": true };

    expect(applyAdminPowerEdits(saved, edits)).toEqual(["company:faqs:faqs:read", "company:menu:items:update"]);
    expect(applyAdminPowerEdits(saved, {})).toEqual(saved);
  });

  it("splits the edits into added and removed", () => {
    const edits = { "b:x:read": true, "a:x:read": true, "c:x:read": false };

    expect(adminPowerChanges(edits)).toEqual({ added: ["a:x:read", "b:x:read"], removed: ["c:x:read"] });
  });
});
