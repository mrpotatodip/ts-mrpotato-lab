import { FaqCategoryBodySchema } from "@repo/contracts/amelie";

export function faqCategoryNameError(value: { name: string }): string | undefined {
  const result = FaqCategoryBodySchema.safeParse(value);
  if (result.success) return undefined;
  return result.error.issues.map((issue) => issue.message).join(", ");
}
