import { createServerFn } from "@tanstack/react-start";
import { apiClient, ApiError } from "#/lib/api-client";
import { tryCatch } from "#/lib/try-catch";
import { withActiveTenant } from "#/lib/active-tenant";
import { DeleteFaqInputSchema, FaqDeletedResponseSchema } from "../schemas";

export const deleteFaq = createServerFn({ method: "POST" })
  .validator(DeleteFaqInputSchema)
  .handler(async ({ data: { faqId } }) => {
    const { data, error } = await tryCatch(
      apiClient.delete(await withActiveTenant(`/faqs/${faqId}`), FaqDeletedResponseSchema),
    );

    if (error) {
      throw new Error(error instanceof ApiError ? error.message : "Failed to delete the FAQ");
    }

    if (!data.data) {
      throw new Error("Failed to delete the FAQ");
    }

    return data.data;
  });
