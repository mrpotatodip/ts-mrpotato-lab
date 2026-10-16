import { describe, expect, it } from "vitest";
import type { MenuEditor } from "@repo/contracts/amelie";
import {
  withCategoriesOrder,
  withItemAvailability,
  withItemImageCover,
  withItemImagesOrder,
  withItemLocations,
  withItemsOrder,
} from "../menu-order";

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
  coverPath: null,
  images: [],
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

describe("withItemImagesOrder", () => {
  it("reorders one item's photos and points coverPath at the first", () => {
    const photos = [
      { id: ID(7), name: "a.jpg", contentType: "image/jpeg", size: 1, sortOrder: 0 },
      { id: ID(8), name: "b.jpg", contentType: "image/jpeg", size: 1, sortOrder: 1 },
    ];
    const withPhotos: MenuEditor = {
      ...menu,
      categories: [{ ...menu.categories[0], items: [{ ...item(4), images: photos, coverPath: `/menu-item-images/${ID(7)}` }] }],
    };
    const next = withItemImagesOrder(withPhotos, ID(4), [ID(8), ID(7)]);
    expect(next.categories[0].items[0].images.map((image) => image.id)).toEqual([ID(8), ID(7)]);
    expect(next.categories[0].items[0].coverPath).toBe(`/menu-item-images/${ID(8)}`);
  });
});

describe("withItemAvailability", () => {
  it("marks one item sold out and leaves the others", () => {
    const next = withItemAvailability(menu, ID(4), false);
    expect(next.categories[0].items[0].isAvailable).toBe(false);
    expect(next.categories[0].items[1].isAvailable).toBe(true);
  });
});

describe("withItemLocations", () => {
  it("records the Locations where an all-Locations item is sold out", () => {
    const next = withItemLocations(menu, ID(4), { availableAtAllLocations: true, locationIds: [ID(9)] });
    expect(next.categories[0].items[0].availableAtAllLocations).toBe(true);
    expect(next.categories[0].items[0].locationIds).toEqual([ID(9)]);
    expect(next.categories[0].items[1].locationIds).toEqual([]);
  });
});

describe("withItemImageCover", () => {
  it("moves the named photo first", () => {
    const photos = [
      { id: ID(7), name: "a.jpg", contentType: "image/jpeg", size: 1, sortOrder: 0 },
      { id: ID(8), name: "b.jpg", contentType: "image/jpeg", size: 1, sortOrder: 1 },
    ];
    const withPhotos: MenuEditor = {
      ...menu,
      categories: [{ ...menu.categories[0], items: [{ ...item(4), images: photos, coverPath: `/menu-item-images/${ID(7)}` }] }],
    };
    const next = withItemImageCover(withPhotos, ID(4), ID(8));
    expect(next.categories[0].items[0].images.map((image) => image.id)).toEqual([ID(8), ID(7)]);
  });
});
