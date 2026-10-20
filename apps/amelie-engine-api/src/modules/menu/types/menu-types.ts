import type { MenuItemImage, MenuItemVariant } from "@repo/contracts/amelie";

// -----
// Menu as the queries assemble it
// -----
export type MenuItem = {
  id: string;
  name: string;
  description: string | null;
  price: string | null;
  currency: string | null;
  variants: MenuItemVariant[] | null;
  isAvailable: boolean;
  availableAtAllLocations: boolean;
  locationIds: string[];
  isSold?: boolean;
  coverPath: string | null;
  images: MenuItemImage[];
  dietaryTags: string[];
};

export type MenuCategory = {
  id: string;
  name: string;
  note: string | null;
  items: MenuItem[];
};

export type MenuItemMatch = MenuItem & { category: string; categoryNote: string | null };

export type MenuItemCard = Pick<MenuItem, "id" | "name" | "price" | "currency" | "variants" | "coverPath">;

export type MenuItemPricing = Pick<MenuItem, "id" | "name" | "price" | "currency" | "variants" | "isAvailable">;

export type MenuItemValues = {
  categoryId: string;
  name: string;
  description: string | null;
  priced: { price: string; variants: MenuItemVariant[] | null } | null;
  isAvailable: boolean;
  countryId: string;
  isSold?: boolean;
};

export type DietaryTagOption = { slug: string; label: string };

export type MenuItemLocationsValues = { availableAtAllLocations: boolean; locationIds: string[] };

// -----
// Menu item images
// -----
export type MenuItemImageFile = { name: string; contentType: string; bytes: ArrayBuffer };

export type MenuItemImageRecord = {
  id: string;
  name: string;
  contentType: string;
  size: number;
  sortOrder: number;
};

export type MenuItemImageBytes = { contentType: string; bytes: ArrayBuffer };

export type MenuImageStorage = {
  put: (key: string, bytes: ArrayBuffer, contentType: string) => Promise<void>;
  get: (key: string) => Promise<ArrayBuffer | null>;
  delete: (key: string) => Promise<void>;
};

export type MenuItemInput = Omit<MenuItemValues, "priced" | "countryId"> & {
  price: string | null;
  variants: MenuItemVariant[] | null;
  dietaryTags: string[];
  countryId?: string;
};
