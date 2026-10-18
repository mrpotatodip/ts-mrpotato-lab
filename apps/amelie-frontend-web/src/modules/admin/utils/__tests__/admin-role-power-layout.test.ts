import { describe, expect, it } from "vitest";
import { adminPowerGroupActions, adminPowerGroupAreas } from "../admin-role-power-layout";
import { toAdminPowerGroups } from "../admin-role-powers";

const company = () => {
  const group = toAdminPowerGroups("tenant").find((candidate) => candidate.key === "company");
  if (!group) throw new Error("the Company group is missing");
  return group;
};

const store = () => {
  const group = toAdminPowerGroups("tenant").find((candidate) => candidate.key === "store");
  if (!group) throw new Error("the Store group is missing");
  return group;
};

describe("adminPowerGroupActions", () => {
  it("lists the Actions a group uses, in the catalogue's order", () => {
    expect(adminPowerGroupActions(company())).toEqual([
      "read",
      "create",
      "update",
      "delete",
      "archive",
      "reorder",
      "publish",
      "dismiss",
    ]);
  });

  it("gives a smaller group only its own columns", () => {
    expect(adminPowerGroupActions(store())).toEqual(["read", "create", "update", "delete"]);
  });
});

describe("adminPowerGroupAreas", () => {
  it("gathers sections under the area they share, with a short row name", () => {
    const areas = adminPowerGroupAreas(company());
    const menu = areas.find((area) => area.name === "Master menu");

    expect(menu?.rows.map((row) => row.label)).toEqual([
      "Menu category",
      "Menu item",
      "Menu item location",
      "Country price",
      "Menu item image",
      "Import",
      "Import draft",
    ]);
  });

  it("keeps every section exactly once", () => {
    const group = company();
    const rows = adminPowerGroupAreas(group).flatMap((area) => area.rows.map((row) => row.section.path));

    expect(rows).toEqual(group.sections.map((section) => section.path));
  });

  it("keeps the full label on the section so a checkbox can still name itself", () => {
    const [area] = adminPowerGroupAreas(company());

    expect(area.rows[0].section.label).toBe(`${area.name} › ${area.rows[0].label}`);
  });
});
