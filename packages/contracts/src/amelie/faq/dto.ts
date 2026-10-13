import { z } from "zod";
import { CountryIdSchema } from "../country";
import { LocationIdSchema } from "../location";

// -----
// Requests: one FAQ and one category are named by
// id; the dashboard sends a whole FAQ to save it
// -----
export const FaqParamSchema = z.object({
  faqId: z.uuid(),
});

export const FaqCategoryParamSchema = z.object({
  categoryId: z.uuid(),
});

export const FaqBodySchema = z.object({
  categoryId: z.uuid().nullable(),
  locationId: LocationIdSchema.nullable().default(null),
  countryId: CountryIdSchema.nullable().default(null),
  question: z.string().trim().min(1).max(200),
  answer: z.string().trim().min(1).max(1000),
});

export const FaqCategoryBodySchema = z.object({
  name: z.string().trim().min(1).max(60),
});

// -----
// Responses: FAQs with the category they sit in
// (null means General), the Location or Country
// they are for (both null means every Location), and the
// Tenant's categories
// -----
export const FaqCategorySchema = z.object({
  id: z.uuid(),
  name: z.string(),
});

export const FaqSchema = z.object({
  id: z.uuid(),
  categoryId: z.uuid().nullable(),
  category: z.string().nullable(),
  locationId: z.uuid().nullable(),
  countryId: z.uuid().nullable(),
  question: z.string(),
  answer: z.string(),
});

export const FaqListSchema = z.object({
  categories: z.array(FaqCategorySchema),
  faqs: z.array(FaqSchema),
});

export const FaqDeletedSchema = z.object({ id: z.uuid() });

export type FaqParam = z.infer<typeof FaqParamSchema>;
export type FaqCategoryParam = z.infer<typeof FaqCategoryParamSchema>;
export type FaqBody = z.infer<typeof FaqBodySchema>;
export type FaqCategoryBody = z.infer<typeof FaqCategoryBodySchema>;
export type FaqCategory = z.infer<typeof FaqCategorySchema>;
export type Faq = z.infer<typeof FaqSchema>;
export type FaqList = z.infer<typeof FaqListSchema>;
export type FaqDeleted = z.infer<typeof FaqDeletedSchema>;
