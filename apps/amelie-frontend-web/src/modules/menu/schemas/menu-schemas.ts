import { z } from "zod";
import {
  MenuCategoryBodySchema,
  MenuCategorySchema,
  MenuDeletedSchema,
  MenuEditorSchema,
  MenuItemBodySchema,
  MenuItemLocationsBodySchema,
  SetMenuItemCountryPriceBodySchema,
  MenuItemImagesSchema,
  MenuItemSchema,
  MenuOrderBodySchema,
} from "@repo/contracts/amelie";
import { apiResponseSchema } from "#/lib/api-response-schema";

export const MenuEditorResponseSchema = apiResponseSchema(MenuEditorSchema);
export const MenuCategoryResponseSchema = apiResponseSchema(MenuCategorySchema.omit({ items: true }));
export const MenuCategoriesResponseSchema = apiResponseSchema(z.array(MenuCategorySchema));
export const MenuItemResponseSchema = apiResponseSchema(MenuItemSchema);
export const MenuDeletedResponseSchema = apiResponseSchema(MenuDeletedSchema);
export const MenuItemImagesResponseSchema = apiResponseSchema(MenuItemImagesSchema);

export const UpdateMenuCategoryInputSchema = MenuCategoryBodySchema.extend({ categoryId: z.uuid() });
export const DeleteMenuCategoryInputSchema = z.object({ categoryId: z.uuid() });
export const ReorderMenuCategoriesInputSchema = MenuOrderBodySchema;
export const ReorderMenuItemsInputSchema = MenuOrderBodySchema.extend({ categoryId: z.uuid() });
export const UpdateMenuItemInputSchema = z.object({ itemId: z.uuid(), body: MenuItemBodySchema });
export const SetMenuItemLocationsInputSchema = z.object({ itemId: z.uuid(), body: MenuItemLocationsBodySchema });
export const MenuScopeInputSchema = z.object({ countryId: z.uuid().optional() });
export const SetMenuItemCountryPriceInputSchema = z.object({
  itemId: z.uuid(),
  countryId: z.uuid(),
  body: SetMenuItemCountryPriceBodySchema,
});
export const DeleteMenuItemInputSchema = z.object({ itemId: z.uuid() });
export const DeleteMenuItemImageInputSchema = z.object({ itemId: z.uuid(), imageId: z.uuid() });
export const SetMenuItemImageCoverInputSchema = z.object({ itemId: z.uuid(), imageId: z.uuid() });
export const ReorderMenuItemImagesInputSchema = MenuOrderBodySchema.extend({ itemId: z.uuid() });
export const AddMenuItemImagesInputSchema = z
  .instanceof(FormData)
  .transform((form) => ({
    itemId: String(form.get("itemId") ?? ""),
    files: form.getAll("files").filter((file): file is File => file instanceof File),
  }))
  .pipe(z.object({ itemId: z.uuid(), files: z.array(z.instanceof(File)).min(1) }));

// -----
// What the boxes of the category and item forms hold:
// text as typed, "" for a blank. The contract bodies
// do the real checks.
// -----
export const MenuCategoryFormValuesSchema = z.object({
  name: z.string(),
  note: z.string(),
});

export const MenuItemVariantFormValuesSchema = z.object({
  name: z.string(),
  price: z.string(),
});

export const MenuItemFormValuesSchema = z.object({
  categoryId: z.string(),
  name: z.string(),
  description: z.string(),
  price: z.string(),
  variants: z.array(MenuItemVariantFormValuesSchema),
  isAvailable: z.boolean(),
  dietaryTags: z.array(z.string()),
});

export type MenuCategoryFormValues = z.infer<typeof MenuCategoryFormValuesSchema>;
export type MenuItemVariantFormValues = z.infer<typeof MenuItemVariantFormValuesSchema>;
export type MenuItemFormValues = z.infer<typeof MenuItemFormValuesSchema>;
