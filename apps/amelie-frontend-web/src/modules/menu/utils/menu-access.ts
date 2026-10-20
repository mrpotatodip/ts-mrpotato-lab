import type { MenuAccess } from "../types";

export function canEditMenuItemRow(access: MenuAccess): boolean {
  return (
    access.canSetLocations ||
    access.canReorderItems ||
    access.canUpdateItem ||
    access.canDeleteItem ||
    canManageMenuImages(access)
  );
}

export function canManageMenuImages(access: MenuAccess): boolean {
  return access.canCreateImage || access.canUpdateImage || access.canDeleteImage || access.canReorderImages;
}

export function canEditMenuCatalog(access: MenuAccess): boolean {
  return (
    access.canCreateCategory ||
    access.canUpdateCategory ||
    access.canDeleteCategory ||
    access.canReorderCategories ||
    access.canCreateItem ||
    canEditMenuItemRow(access) ||
    access.canSetCountryPrice
  );
}
