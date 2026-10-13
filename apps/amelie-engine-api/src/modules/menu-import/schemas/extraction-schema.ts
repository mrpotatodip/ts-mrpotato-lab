import { z } from "zod";

// -----
// What the model returns for one file. Every field is
// present (null when unknown), as strict JSON schema
// needs. Prices stay text; the app cleans them.
// -----
const ExtractedVariantSchema = z.object({ name: z.string(), price: z.string() });

const ExtractedItemSchema = z.object({
  name: z.string(),
  description: z.string().nullable(),
  price: z.string().nullable(),
  variants: z.array(ExtractedVariantSchema).nullable(),
  dietaryTags: z.array(z.string()),
  reviewNote: z.string().nullable(),
});

const ExtractedCategorySchema = z.object({
  name: z.string(),
  note: z.string().nullable(),
  reviewNote: z.string().nullable(),
  items: z.array(ExtractedItemSchema),
});

const ExtractedHoursSchema = z.object({
  dayOfWeek: z.number().int(),
  isClosed: z.boolean(),
  opensAt: z.string().nullable(),
  closesAt: z.string().nullable(),
  reviewNote: z.string().nullable(),
});

const ExtractedProfileSchema = z.object({
  description: z.string().nullable(),
  websiteUrl: z.string().nullable(),
  phone: z.string().nullable(),
  email: z.string().nullable(),
  address: z.string().nullable(),
});

export const ExtractedMenuSchema = z.object({
  menuReviewNote: z.string().nullable(),
  categories: z.array(ExtractedCategorySchema),
  hours: z.array(ExtractedHoursSchema),
  profile: ExtractedProfileSchema.nullable(),
});

export type ExtractedMenu = z.infer<typeof ExtractedMenuSchema>;
