export type MenuFocus = { categoryId: string; itemId: string | null };

// -----
// Pointing at what is already shown clears it,
// so the same eye turns the view on and off.
// -----
export const toggleMenuFocus = (current: MenuFocus | null, next: MenuFocus): MenuFocus | null =>
  current && current.categoryId === next.categoryId && current.itemId === next.itemId ? null : next;
