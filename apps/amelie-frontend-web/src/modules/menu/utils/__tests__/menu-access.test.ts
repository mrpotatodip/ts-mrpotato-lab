import { describe, expect, it } from "vitest";
import type { MenuAccess } from "../../types";
import { canEditMenuCatalog, canEditMenuItemRow, canManageMenuImages } from "../menu-access";

const NONE: MenuAccess = {
  canCreateCategory: false,
  canUpdateCategory: false,
  canDeleteCategory: false,
  canReorderCategories: false,
  canCreateItem: false,
  canUpdateItem: false,
  canDeleteItem: false,
  canReorderItems: false,
  canSetCountryPrice: false,
  canSetLocations: false,
  canSetAvailability: false,
  canCreateImage: false,
  canUpdateImage: false,
  canDeleteImage: false,
  canReorderImages: false,
};

describe("menu access", () => {
  it("offers nothing to a role with no menu Power", () => {
    expect(canEditMenuCatalog(NONE)).toBe(false);
    expect(canEditMenuItemRow(NONE)).toBe(false);
    expect(canManageMenuImages(NONE)).toBe(false);
  });

  it.each(["canCreateImage", "canUpdateImage", "canDeleteImage", "canReorderImages"] as const)(
    "lets %s open the photos",
    (power) => {
      expect(canManageMenuImages({ ...NONE, [power]: true })).toBe(true);
      expect(canEditMenuItemRow({ ...NONE, [power]: true })).toBe(true);
    },
  );

  it("counts a category-only role as a catalog editor but not an item-row editor", () => {
    const access = { ...NONE, canCreateCategory: true };

    expect(canEditMenuCatalog(access)).toBe(true);
    expect(canEditMenuItemRow(access)).toBe(false);
  });

  it("counts a locations-only role as an item-row editor, and sold-out alone as neither", () => {
    expect(canEditMenuItemRow({ ...NONE, canSetLocations: true })).toBe(true);
    expect(canEditMenuItemRow({ ...NONE, canSetAvailability: true })).toBe(false);
    expect(canEditMenuCatalog({ ...NONE, canSetAvailability: true })).toBe(false);
  });

  it("counts a country-price-only role as a catalog editor", () => {
    expect(canEditMenuCatalog({ ...NONE, canSetCountryPrice: true })).toBe(true);
  });
});
