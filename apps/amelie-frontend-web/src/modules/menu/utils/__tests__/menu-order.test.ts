import { describe, expect, it } from "vitest";
import type { MenuEditor } from "@repo/contracts/amelie";
import { withCategoriesOrder, withItemsOrder } from "../menu-order";

const ID = (n: number) => `00000000-0000-4000-8000-00000000000${n}`;

const item = (n: number) => ({
  id: ID(n),
  name: `item ${n}`,
  description: null,
  price: "1.00",
  currency: "USD",
  variants: null,
  isAvailable: true,
  availableAtAllLocations: true,
  locationIds: [],
  imageUrl: null,
  dietaryTags: [],
});

const menu: MenuEditor = {
  dietaryTags: [],
  categories: [
    { id: ID(1), name: "Coffee", note: null, items: [item(4), item(5), item(6)] },
    { id: ID(2), name: "Food", note: null, items: [] },
  ],
};

describe("withCategoriesOrder", () => {
  it("puts the named categories in the given order", () => {
    expect(withCategoriesOrder(menu, [ID(2), ID(1)]).categories.map((category) => category.id)).toEqual([ID(2), ID(1)]);
  });

  it("keeps a category the order does not name, after the named ones", () => {
    expect(withCategoriesOrder(menu, [ID(2)]).categories.map((category) => category.id)).toEqual([ID(2), ID(1)]);
  });
});

describe("withItemsOrder", () => {
  it("reorders the items of one category", () => {
    const next = withItemsOrder(menu, ID(1), [ID(6), ID(4), ID(5)]);
    expect(next.categories[0].items.map((entry) => entry.id)).toEqual([ID(6), ID(4), ID(5)]);
  });

  it("leaves other categories alone", () => {
    const next = withItemsOrder(menu, ID(1), [ID(6), ID(4), ID(5)]);
    expect(next.categories[1]).toBe(menu.categories[1]);
  });
});
