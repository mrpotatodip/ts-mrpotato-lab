import type { MenuCategory, MenuEditor, MenuItem } from "@repo/contracts/amelie";
import { menuItemImagePath } from "./menu-item-image-url";

const sortByIds = <T extends { id: string }>(rows: T[], ids: string[]): T[] => {
  const byId = new Map(rows.map((row) => [row.id, row]));
  const named = ids.flatMap((id) => byId.get(id) ?? []);
  return [...named, ...rows.filter((row) => !ids.includes(row.id))];
};

export const withCategoriesOrder = (menu: MenuEditor, ids: string[]): MenuEditor => ({
  ...menu,
  categories: sortByIds(menu.categories, ids),
});

export const withItemsOrder = (menu: MenuEditor, categoryId: string, ids: string[]): MenuEditor => ({
  ...menu,
  categories: menu.categories.map(
    (category): MenuCategory =>
      category.id === categoryId ? { ...category, items: sortByIds(category.items, ids) } : category,
  ),
});

const withItemImages = (item: MenuItem, ids: string[]): MenuItem => {
  const images = sortByIds(item.images, ids).map((image, sortOrder) => ({ ...image, sortOrder }));
  const cover = images[0];
  return { ...item, images, coverPath: cover ? menuItemImagePath(cover.id) : null };
};

export const withItemImagesOrder = (menu: MenuEditor, itemId: string, ids: string[]): MenuEditor => ({
  ...menu,
  categories: menu.categories.map((category) => ({
    ...category,
    items: category.items.map((item) => (item.id === itemId ? withItemImages(item, ids) : item)),
  })),
});

const withItem = (menu: MenuEditor, itemId: string, next: (item: MenuItem) => MenuItem): MenuEditor => ({
  ...menu,
  categories: menu.categories.map((category) => ({
    ...category,
    items: category.items.map((item) => (item.id === itemId ? next(item) : item)),
  })),
});

export const withItemAvailability = (menu: MenuEditor, itemId: string, isAvailable: boolean): MenuEditor =>
  withItem(menu, itemId, (item) => ({ ...item, isAvailable }));

export const withItemLocations = (
  menu: MenuEditor,
  itemId: string,
  locations: Pick<MenuItem, "availableAtAllLocations" | "locationIds">,
): MenuEditor =>
  withItem(menu, itemId, (item) => ({
    ...item,
    availableAtAllLocations: locations.availableAtAllLocations,
    locationIds: locations.locationIds,
  }));

export const withItemImageCover = (menu: MenuEditor, itemId: string, imageId: string): MenuEditor => {
  const item = menu.categories.flatMap((category) => category.items).find((entry) => entry.id === itemId);
  if (!item) return menu;
  return withItemImagesOrder(menu, itemId, [imageId, ...item.images.map((image) => image.id).filter((id) => id !== imageId)]);
};
