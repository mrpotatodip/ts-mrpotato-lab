import { createServerFn } from "@tanstack/react-start";
import { FaqBodySchema } from "@repo/contracts/amelie";
import { apiClient, ApiError } from "#/lib/api-client";
import { tryCatch } from "#/lib/try-catch";
import { withActiveTenant } from "#/lib/active-tenant";
import { FaqResponseSchema } from "../schemas";

export const addFaq = createServerFn({ method: "POST" })
  .validator(FaqBodySchema)
  .handler(async ({ data: body }) => {
    const { data, error } = await tryCatch(
      apiClient.post(await withActiveTenant("/faqs"), FaqResponseSchema, body),
    );

    if (error) {
      throw new Error(error instanceof ApiError ? error.message : "Failed to save the FAQ");
    }

    if (!data.data) {
      throw new Error("Failed to save the FAQ");
    }

    return data.data;
  });
