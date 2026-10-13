import { createServerFn } from "@tanstack/react-start";
import { apiClient, ApiError } from "#/lib/api-client";
import { tryCatch } from "#/lib/try-catch";
import { withActiveTenant } from "#/lib/active-tenant";
import { FaqResponseSchema, UpdateFaqInputSchema } from "../schemas";

export const updateFaq = createServerFn({ method: "POST" })
  .validator(UpdateFaqInputSchema)
  .handler(async ({ data: { faqId, ...body } }) => {
    const { data, error } = await tryCatch(
      apiClient.put(await withActiveTenant(`/faqs/${faqId}`), FaqResponseSchema, body),
    );

    if (error) {
      throw new Error(error instanceof ApiError ? error.message : "Failed to save the FAQ");
    }

    if (!data.data) {
      throw new Error("Failed to save the FAQ");
    }

    return data.data;
  });
