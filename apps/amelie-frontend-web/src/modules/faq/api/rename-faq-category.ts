import { createServerFn } from "@tanstack/react-start";
import { apiClient, ApiError } from "#/lib/api-client";
import { tryCatch } from "#/lib/try-catch";
import { withActiveTenant } from "#/lib/active-tenant";
import { FaqCategoryResponseSchema, RenameFaqCategoryInputSchema } from "../schemas";

export const renameFaqCategory = createServerFn({ method: "POST" })
  .validator(RenameFaqCategoryInputSchema)
  .handler(async ({ data: { categoryId, ...body } }) => {
    const { data, error } = await tryCatch(
      apiClient.put(await withActiveTenant(`/faqs/categories/${categoryId}`), FaqCategoryResponseSchema, body),
    );

    if (error) {
      throw new Error(error instanceof ApiError ? error.message : "Failed to save the category");
    }

    if (!data.data) {
      throw new Error("Failed to save the category");
    }

    return data.data;
  });
