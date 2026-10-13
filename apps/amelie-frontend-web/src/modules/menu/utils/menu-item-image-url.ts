import { MENU_ITEM_IMAGE_MAX, type MenuItemImage } from "@repo/contracts/amelie";
import { API_BASE_URL } from "#/lib/api-base-url";

export const menuItemImagePath = (imageId: string): string => `/menu-item-images/${imageId}`;

export const toMenuItemImageUrl = (imageUrl: string | null): string | null => {
  if (!imageUrl) return null;
  if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) return imageUrl;
  return `${API_BASE_URL}${imageUrl.startsWith("/") ? imageUrl : `/${imageUrl}`}`;
};

export const remainingMenuItemImageSlots = (count: number): number => Math.max(0, MENU_ITEM_IMAGE_MAX - count);

export const toMenuItemCoverUrl = (images: MenuItemImage[], imageUrl: string | null): string | null => {
  const cover = images[0];
  return cover ? toMenuItemImageUrl(menuItemImagePath(cover.id)) : toMenuItemImageUrl(imageUrl);
};
