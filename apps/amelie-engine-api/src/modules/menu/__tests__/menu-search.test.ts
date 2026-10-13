import { describe, expect, it } from "vitest";
import { findMenuItems } from "#/modules/menu/lib";
import type { MenuCategory, MenuItem } from "#/modules/menu/types";

const item = (name: string, dietaryTags: string[] = []): MenuItem => ({
  id: name,
  name,
  description: null,
  price: "10",
  currency: "USD",
  variants: null,
  isAvailable: true,
  imageUrl: null,
  dietaryTags,
});

const menu: MenuCategory[] = [
  {
    id: "sandwiches",
    name: "Sandwiches",
    note: "Substitute gluten-free bread +2.",
    items: [item("Turkey Club"), item("Caprese")],
  },
  { id: "pastries", name: "Pastries", note: null, items: [item("Gluten-Free Muffin", ["gluten-free"]), item("Croissant")] },
];

describe("findMenuItems category notes", () => {
  it("lists tagged items first, then items whose note offers the tag", () => {
    const found = findMenuItems(menu, { text: null, dietaryTag: "gluten-free" });

    expect(found.map((i) => [i.name, i.categoryNote])).toEqual([
      ["Gluten-Free Muffin", null],
      ["Turkey Club", "Substitute gluten-free bread +2."],
      ["Caprese", "Substitute gluten-free bread +2."],
    ]);
  });

  it("matches text in a category note", () => {
    expect(findMenuItems(menu, { text: "bread", dietaryTag: null }).map((i) => i.name)).toEqual([
      "Turkey Club",
      "Caprese",
    ]);
  });

  it("leaves items with no tag and no matching note out", () => {
    expect(findMenuItems(menu, { text: null, dietaryTag: "vegan" })).toEqual([]);
  });
});
