import { z } from "zod";
import {
  IMPORT_DRAFT_STATUS_VALUES,
  IMPORT_PUBLISH_MODE_VALUES,
  IMPORT_STATUS_VALUES,
} from "../enums";
import { CountryIdSchema } from "../country";
import { LocationIdSchema } from "../location";
import { MenuItemVariantSchema, MenuPriceSchema } from "../menu";
import { HoursFields, checkOpeningTimes } from "../schedule";

// -----
// What a draft holds, one schema per kind. A menu item
// names its category, since drafts have no ids yet.
// -----
export const MenuCategoryDraftDataSchema = z.object({
  name: z.string().trim().min(1).max(80),
  note: z.string().trim().min(1).max(300).nullable(),
});

export const MenuItemDraftDataSchema = z
  .object({
    categoryName: z.string().trim().min(1).max(80),
    name: z.string().trim().min(1).max(120),
    description: z.string().trim().min(1).max(500).nullable(),
    price: MenuPriceSchema.nullable(),
    variants: z.array(MenuItemVariantSchema).min(1).max(10).nullable(),
    dietaryTags: z.array(z.string().min(1)).max(20),
  })
  .superRefine((item, ctx) => {
    if (item.variants === null && item.price === null) {
      ctx.addIssue({ code: "custom", path: ["price"], message: "a price is needed when there are no Variants" });
    }
  });

export const BusinessHoursDraftDataSchema = z
  .object({ dayOfWeek: z.number().int().min(0).max(6), ...HoursFields })
  .superRefine(checkOpeningTimes);

export const BusinessProfileDraftDataSchema = z.object({
  description: z.string().trim().min(1).max(500).nullable(),
  websiteUrl: z.url().nullable(),
  phone: z.string().trim().min(1).max(40).nullable(),
  email: z.string().trim().max(120).regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/).nullable(),
  address: z.string().trim().min(1).max(200).nullable(),
});

// -----
// Requests
// -----
export const ImportParamSchema = z.object({
  importId: z.uuid(),
});

export const ImportDraftParamSchema = z.object({
  importId: z.uuid(),
  draftId: z.uuid(),
});

export const UpdateImportDraftBodySchema = z
  .object({
    data: z.record(z.string(), z.unknown()).optional(),
    status: z.enum(IMPORT_DRAFT_STATUS_VALUES).optional(),
  })
  .refine((body) => body.data !== undefined || body.status !== undefined, {
    message: "send data, a status, or both",
  });

// -----
// Hours and contact details go to one Location, menu
// items are priced in one Country: the one named, or
// the Tenant's only one.
// -----
export const PublishImportBodySchema = z.object({
  mode: z.enum(IMPORT_PUBLISH_MODE_VALUES),
  locationId: LocationIdSchema.optional(),
  countryId: CountryIdSchema.optional(),
});

// -----
// Responses
// -----
const draftBase = {
  id: z.uuid(),
  sourceFile: z.string(),
  reviewNote: z.string().nullable(),
  status: z.enum(IMPORT_DRAFT_STATUS_VALUES),
};

export const ImportDraftSchema = z.discriminatedUnion("kind", [
  z.object({ ...draftBase, kind: z.literal("menu_category"), data: MenuCategoryDraftDataSchema }),
  z.object({ ...draftBase, kind: z.literal("menu_item"), data: MenuItemDraftDataSchema }),
  z.object({ ...draftBase, kind: z.literal("business_hours"), data: BusinessHoursDraftDataSchema }),
  z.object({ ...draftBase, kind: z.literal("business_profile"), data: BusinessProfileDraftDataSchema }),
]);

export const ImportFileSchema = z.object({
  name: z.string(),
  contentType: z.string(),
  size: z.number().int(),
});

export const ImportSummarySchema = z.object({
  id: z.uuid(),
  status: z.enum(IMPORT_STATUS_VALUES),
  error: z.string().nullable(),
  files: z.array(ImportFileSchema),
  createdAt: z.iso.datetime(),
  finishedAt: z.iso.datetime().nullable(),
  publishedAt: z.iso.datetime().nullable(),
  pendingCount: z.number().int(),
  approvedCount: z.number().int(),
  discardedCount: z.number().int(),
});

export const ImportListSchema = z.array(ImportSummarySchema);

export const ImportDetailSchema = ImportSummarySchema.extend({
  drafts: z.array(ImportDraftSchema),
});

export const PublishedImportSchema = z.object({
  menuCategories: z.number().int(),
  menuItems: z.number().int(),
  businessHours: z.number().int(),
  profileFieldsFilled: z.number().int(),
});

export type ImportParam = z.infer<typeof ImportParamSchema>;
export type ImportDraftParam = z.infer<typeof ImportDraftParamSchema>;
export type UpdateImportDraftBody = z.infer<typeof UpdateImportDraftBodySchema>;
export type PublishImportBody = z.infer<typeof PublishImportBodySchema>;
export type MenuCategoryDraftData = z.infer<typeof MenuCategoryDraftDataSchema>;
export type MenuItemDraftData = z.infer<typeof MenuItemDraftDataSchema>;
export type BusinessHoursDraftData = z.infer<typeof BusinessHoursDraftDataSchema>;
export type BusinessProfileDraftData = z.infer<typeof BusinessProfileDraftDataSchema>;
export type ImportDraft = z.infer<typeof ImportDraftSchema>;
export type ImportSummary = z.infer<typeof ImportSummarySchema>;
export type ImportList = z.infer<typeof ImportListSchema>;
export type ImportDetail = z.infer<typeof ImportDetailSchema>;
export type PublishedImport = z.infer<typeof PublishedImportSchema>;
