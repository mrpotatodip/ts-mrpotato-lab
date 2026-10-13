import {
  BusinessHoursDraftDataSchema,
  BusinessProfileDraftDataSchema,
  MenuCategoryDraftDataSchema,
  MenuItemDraftDataSchema,
  type BusinessHoursDraftData,
  type BusinessProfileDraftData,
  type MenuCategoryDraftData,
  type MenuItemDraftData,
} from "@repo/contracts/amelie";
import type { PublishPlanInput } from "#/modules/menu-import/types";

type ApprovedDraft = { kind: string; data: unknown };

export type PublishPlan = {
  menuCategories: MenuCategoryDraftData[];
  menuItems: Array<Omit<MenuItemDraftData, "price"> & { price: string }>;
  businessHours: Array<Omit<BusinessHoursDraftData, "dayOfWeek"> & { dayOfWeek: number }>;
  businessProfile: BusinessProfileDraftData | null;
};

// -----
// What an approved set of drafts will change. A
// category an item names but no draft lists is added
// too; a price with Variants is the lowest Variant.
// A draft that no longer fits its schema stops it all.
// -----
export const planPublish = (mode: PublishPlanInput["mode"], approved: ReadonlyArray<ApprovedDraft>): PublishPlan => {
  const categories = approved.filter((d) => d.kind === "menu_category").map((d) => MenuCategoryDraftDataSchema.parse(d.data));
  const items = approved.filter((d) => d.kind === "menu_item").map((d) => MenuItemDraftDataSchema.parse(d.data));
  const hours = approved.filter((d) => d.kind === "business_hours").map((d) => BusinessHoursDraftDataSchema.parse(d.data));
  const profiles = approved.filter((d) => d.kind === "business_profile").map((d) => BusinessProfileDraftDataSchema.parse(d.data));

  const named = new Map<string, MenuCategoryDraftData>();
  for (const category of categories) named.set(category.name.toLowerCase(), category);
  for (const item of items) {
    if (!named.has(item.categoryName.toLowerCase())) named.set(item.categoryName.toLowerCase(), { name: item.categoryName, note: null });
  }

  const byDay = new Map<number, BusinessHoursDraftData>();
  for (const day of hours) byDay.set(day.dayOfWeek, day);

  const businessProfile = profiles.length
    ? {
        description: profiles.map((p) => p.description).find((v) => v !== null) ?? null,
        websiteUrl: profiles.map((p) => p.websiteUrl).find((v) => v !== null) ?? null,
        phone: profiles.map((p) => p.phone).find((v) => v !== null) ?? null,
        email: profiles.map((p) => p.email).find((v) => v !== null) ?? null,
        address: profiles.map((p) => p.address).find((v) => v !== null) ?? null,
      }
    : null;

  return {
    menuCategories: mode === "replace" || named.size > 0 ? [...named.values()] : [],
    menuItems: items.map((item) => ({
      ...item,
      price: item.variants ? Math.min(...item.variants.map((v) => Number(v.price))).toFixed(2) : (item.price ?? "0.00"),
    })),
    businessHours: [...byDay.values()],
    businessProfile,
  };
};
