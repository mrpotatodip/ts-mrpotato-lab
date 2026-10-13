import type { MenuCategoryBody, MenuItem } from "@repo/contracts/amelie";
import type { MenuCategoryFormValues, MenuItemFormValues } from "../schemas";
import { toItemPrice } from "./menu-item-country";

export const toCategoryFormValues = (initial: MenuCategoryBody | null): MenuCategoryFormValues => ({
  name: initial?.name ?? "",
  note: initial?.note ?? "",
});

// -----
// A blank note is no note. The result still goes
// through MenuCategoryBodySchema.
// -----
export const toCategoryCandidate = (values: MenuCategoryFormValues) => ({
  name: values.name,
  note: values.note.trim() === "" ? null : values.note,
});

export const toItemFormValues = (initial: MenuItem | null, categoryId: string): MenuItemFormValues => ({
  categoryId,
  name: initial?.name ?? "",
  description: initial?.description ?? "",
  price: initial?.variants ? "" : (initial?.price ?? ""),
  variants: initial?.variants ?? [],
  isAvailable: initial?.isAvailable ?? true,
  dietaryTags: initial?.dietaryTags ?? [],
});

// -----
// countryScoped: editing with a Country picked, where
// a blank price leaves that Country's price alone.
// -----
type ItemCandidateScope = {
  countryId: string | undefined;
  countryScoped: boolean;
};

// -----
// The form's boxes as an item body, before the
// contract checks it. Blank description is none;
// Variants carry the price, so it is dropped.
// -----
export const toItemCandidate = (values: MenuItemFormValues, scope: ItemCandidateScope) => ({
  categoryId: values.categoryId,
  countryId: scope.countryId,
  name: values.name,
  description: values.description.trim() === "" ? null : values.description,
  price: toItemPrice(values.price, values.variants.length > 0, scope.countryScoped),
  variants: values.variants.length > 0 ? values.variants : null,
  isAvailable: values.isAvailable,
  dietaryTags: values.dietaryTags,
});
