import { z } from "zod";
import { LocationIdSchema } from "../location";

// -----
// A price as stored: up to two decimals,
// kept as text so it never rounds
// -----
export const MenuPriceSchema = z.string().regex(/^\d{1,8}(\.\d{1,2})?$/);

export const MenuItemVariantSchema = z.object({
  name: z.string().min(1),
  price: MenuPriceSchema,
});

export type MenuItemVariant = z.infer<typeof MenuItemVariantSchema>;

// -----
// Requests: the dashboard sends a whole category or
// item to save it; with Variants the price is the
// lowest Variant, so it is not sent
// -----
export const MenuCategoryParamSchema = z.object({
  categoryId: z.uuid(),
});

export const MenuItemParamSchema = z.object({
  itemId: z.uuid(),
});

export const MenuItemImageParamSchema = z.object({
  imageId: z.uuid(),
});

export const MenuItemImageNestedParamSchema = z.object({
  itemId: z.uuid(),
  imageId: z.uuid(),
});

export const MenuCategoryBodySchema = z.object({
  name: z.string().trim().min(1).max(80),
  note: z.string().trim().min(1).max(300).nullable(),
});

export const MenuOrderBodySchema = z.object({
  ids: z.array(z.uuid()).min(1).max(200),
});

// -----
// The Menu page names a Location or a Country in the
// query. With a Country it gets every item, each with
// its Country price and isSold.
// -----
export const MenuQuerySchema = z.object({
  locationId: LocationIdSchema.optional(),
  countryId: z.uuid().optional(),
});

const hasDuplicateVariantNames = (variants: ReadonlyArray<{ name: string }> | null | undefined): boolean => {
  const names = (variants ?? []).map((variant) => variant.name.trim().toLowerCase());
  return new Set(names).size !== names.length;
};

// -----
// An item is priced in one Country: countryId is
// required once the Tenant has two open ones. isSold
// left out keeps the flag (a new price is sold). With a
// countryId, price and Variants may both be left out
// when the edit is about the item's own fields (name,
// category, availability): that Country's price is kept.
// -----
export const MenuItemBodySchema = z
  .object({
    categoryId: z.uuid(),
    countryId: z.uuid().optional(),
    isSold: z.boolean().optional(),
    name: z.string().trim().min(1).max(120),
    description: z.string().trim().min(1).max(500).nullable(),
    price: MenuPriceSchema.nullable(),
    variants: z.array(MenuItemVariantSchema).min(1).max(10).nullable(),
    isAvailable: z.boolean(),
    dietaryTags: z.array(z.string().min(1)).max(20),
  })
  .superRefine((item, ctx) => {
    if (item.variants === null && item.price === null && item.countryId === undefined) {
      ctx.addIssue({ code: "custom", path: ["price"], message: "a price is needed when there are no Variants" });
    }
    if (hasDuplicateVariantNames(item.variants)) {
      ctx.addIssue({ code: "custom", path: ["variants"], message: "Variant names must be different" });
    }
  });

// -----
// One item's price in one Country, and whether it is
// sold there. Price and Variants left out change only
// the flag: turning sold-here off keeps the price.
// -----
export const MenuItemCountryParamSchema = z.object({
  itemId: z.uuid(),
  countryId: z.uuid(),
});

export const SetMenuItemCountryPriceBodySchema = z
  .object({
    isSold: z.boolean(),
    price: MenuPriceSchema.nullable().optional(),
    variants: z.array(MenuItemVariantSchema).min(1).max(10).nullable().optional(),
  })
  .superRefine((body, ctx) => {
    const pricing = body.price !== undefined || body.variants !== undefined;
    if (pricing && !body.variants && !body.price) {
      ctx.addIssue({ code: "custom", path: ["price"], message: "a price is needed when there are no Variants" });
    }
    if (hasDuplicateVariantNames(body.variants)) {
      ctx.addIssue({ code: "custom", path: ["variants"], message: "Variant names must be different" });
    }
  });

// -----
// Where an item is sold. locationIds are the
// Locations where it is sold out when it is sold
// at all Locations, else the only Locations that
// sell it.
// -----
export const MenuItemLocationsBodySchema = z
  .object({
    availableAtAllLocations: z.boolean(),
    locationIds: z.array(LocationIdSchema).max(100),
  })
  .superRefine((body, ctx) => {
    if (!body.availableAtAllLocations && body.locationIds.length === 0) {
      ctx.addIssue({ code: "custom", path: ["locationIds"], message: "choose at least one Location" });
    }
    if (new Set(body.locationIds).size !== body.locationIds.length) {
      ctx.addIssue({ code: "custom", path: ["locationIds"], message: "each Location can be listed once" });
    }
  });

export const MenuItemImageSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  contentType: z.string(),
  size: z.number().int().nonnegative(),
  sortOrder: z.number().int().nonnegative(),
});

export const MenuItemImagesSchema = z.array(MenuItemImageSchema);

// -----
// Responses: the menu as the dashboard edits it,
// with the shared Dietary tag list to choose from
// -----
export const MenuItemSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  description: z.string().nullable(),
  price: z.string().nullable(),
  currency: z.string().nullable(),
  variants: z.array(MenuItemVariantSchema).nullable(),
  isAvailable: z.boolean(),
  availableAtAllLocations: z.boolean(),
  locationIds: z.array(z.uuid()),
  isSold: z.boolean().optional(),
  coverPath: z.string().nullable(),
  images: z.array(MenuItemImageSchema),
  dietaryTags: z.array(z.string()),
});

export const MenuCategorySchema = z.object({
  id: z.uuid(),
  name: z.string(),
  note: z.string().nullable(),
  items: z.array(MenuItemSchema),
});

export const DietaryTagSchema = z.object({
  slug: z.string(),
  label: z.string(),
});

export const MenuEditorSchema = z.object({
  categories: z.array(MenuCategorySchema),
  dietaryTags: z.array(DietaryTagSchema),
});

export const MenuDeletedSchema = z.object({ id: z.uuid() });

export type MenuCategoryParam = z.infer<typeof MenuCategoryParamSchema>;
export type MenuItemParam = z.infer<typeof MenuItemParamSchema>;
export type MenuItemImageParam = z.infer<typeof MenuItemImageParamSchema>;
export type MenuItemImageNestedParam = z.infer<typeof MenuItemImageNestedParamSchema>;
export type MenuItemImage = z.infer<typeof MenuItemImageSchema>;
export type MenuItemImages = z.infer<typeof MenuItemImagesSchema>;
export type MenuCategoryBody = z.infer<typeof MenuCategoryBodySchema>;
export type MenuOrderBody = z.infer<typeof MenuOrderBodySchema>;
export type MenuItemLocationsBody = z.infer<typeof MenuItemLocationsBodySchema>;
export type MenuQuery = z.infer<typeof MenuQuerySchema>;
export type MenuItemCountryParam = z.infer<typeof MenuItemCountryParamSchema>;
export type SetMenuItemCountryPriceBody = z.infer<typeof SetMenuItemCountryPriceBodySchema>;
export type MenuItemBody = z.infer<typeof MenuItemBodySchema>;
export type MenuItem = z.infer<typeof MenuItemSchema>;
export type MenuCategory = z.infer<typeof MenuCategorySchema>;
export type DietaryTag = z.infer<typeof DietaryTagSchema>;
export type MenuEditor = z.infer<typeof MenuEditorSchema>;
export type MenuDeleted = z.infer<typeof MenuDeletedSchema>;
