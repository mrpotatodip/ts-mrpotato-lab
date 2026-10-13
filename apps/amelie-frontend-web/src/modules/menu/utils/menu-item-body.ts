import type { MenuItem, MenuItemBody } from "@repo/contracts/amelie";

// -----
// An item as the update body: the same item, with
// only what changes swapped in.
// -----
export const toMenuItemBody = (item: MenuItem, categoryId: string, change: Partial<MenuItemBody>): MenuItemBody => ({
  categoryId,
  name: item.name,
  description: item.description,
  price: item.variants ? null : item.price,
  variants: item.variants,
  isAvailable: item.isAvailable,
  dietaryTags: item.dietaryTags,
  ...change,
});
