import { MENU_ITEM_IMAGE_MAX } from "@repo/contracts/amelie";
import { toMenuItemImageUrl } from "#/lib/to-menu-item-image-url";

export { toMenuItemImageUrl };

export const menuItemImagePath = (imageId: string): string => `/menu-item-images/${imageId}`;

export const remainingMenuItemImageSlots = (count: number): number => Math.max(0, MENU_ITEM_IMAGE_MAX - count);
