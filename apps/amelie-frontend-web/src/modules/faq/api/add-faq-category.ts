import { createServerFn } from "@tanstack/react-start";
import { FaqCategoryBodySchema } from "@repo/contracts/amelie";
import { apiClient, ApiError } from "#/lib/api-client";
import { tryCatch } from "#/lib/try-catch";
import { withActiveTenant } from "#/lib/active-tenant";
import { FaqCategoryResponseSchema } from "../schemas";

export const addFaqCategory = createServerFn({ method: "POST" })
  .validator(FaqCategoryBodySchema)
  .handler(async ({ data: body }) => {
    const { data, error } = await tryCatch(
      apiClient.post(await withActiveTenant("/faqs/categories"), FaqCategoryResponseSchema, body),
    );

    if (error) {
      throw new Error(error instanceof ApiError ? error.message : "Failed to save the category");
    }

    if (!data.data) {
      throw new Error("Failed to save the category");
    }

    return data.data;
  });
