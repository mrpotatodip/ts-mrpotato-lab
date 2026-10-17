import { useActiveTenantRole } from "#/modules/tenant";
import type { MenuAccess } from "../types";

// -----
// What this role may do on the menu screens. Every control
// has its own Power, so a role can reorder items without
// being allowed to delete them.
// -----
export function useMenuAccess(): MenuAccess {
  const { can } = useActiveTenantRole();
  return {
    canCreateCategory: can("company:menu:categories:create"),
    canUpdateCategory: can("company:menu:categories:update"),
    canDeleteCategory: can("company:menu:categories:delete"),
    canReorderCategories: can("company:menu:categories:reorder"),
    canCreateItem: can("company:menu:items:create"),
    canUpdateItem: can("company:menu:items:update"),
    canDeleteItem: can("company:menu:items:delete"),
    canReorderItems: can("company:menu:items:reorder"),
    canSetCountryPrice: can("company:menu:country_prices:update"),
    canSetAvailability: can("store:menu:availability:update"),
    canCreateImage: can("company:menu:images:create"),
    canUpdateImage: can("company:menu:images:update"),
    canDeleteImage: can("company:menu:images:delete"),
    canReorderImages: can("company:menu:images:reorder"),
  };
}
