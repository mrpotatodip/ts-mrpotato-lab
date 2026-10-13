import { z } from "zod";
import {
  FaqBodySchema,
  FaqCategoryBodySchema,
  FaqCategorySchema,
  FaqDeletedSchema,
  FaqListSchema,
  FaqSchema,
} from "@repo/contracts/amelie";
import { apiResponseSchema } from "#/lib/api-response-schema";

export const FaqListResponseSchema = apiResponseSchema(FaqListSchema);
export const FaqResponseSchema = apiResponseSchema(FaqSchema);
export const FaqCategoryResponseSchema = apiResponseSchema(FaqCategorySchema);
export const FaqDeletedResponseSchema = apiResponseSchema(FaqDeletedSchema);

export const UpdateFaqInputSchema = FaqBodySchema.extend({ faqId: z.uuid() });
export const DeleteFaqInputSchema = z.object({ faqId: z.uuid() });
export const RenameFaqCategoryInputSchema = FaqCategoryBodySchema.extend({ categoryId: z.uuid() });
export const DeleteFaqCategoryInputSchema = z.object({ categoryId: z.uuid() });

// -----
// What the FAQ form holds while it is edited: the
// category and scope are select values, not ids yet.
// -----
export const FaqFormValuesSchema = z.object({
  categoryId: z.string(),
  scope: z.string(),
  question: z.string(),
  answer: z.string(),
});

export type FaqFormValues = z.infer<typeof FaqFormValuesSchema>;
