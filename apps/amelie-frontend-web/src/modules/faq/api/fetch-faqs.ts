import { createServerFn } from "@tanstack/react-start";
import { apiClient, ApiError } from "#/lib/api-client";
import { tryCatch } from "#/lib/try-catch";
import { withActiveTenant } from "#/lib/active-tenant";
import { FaqListResponseSchema } from "../schemas";

export const fetchFaqs = createServerFn({ method: "GET" }).handler(async () => {
    const { data, error } = await tryCatch(
      apiClient.get(await withActiveTenant("/faqs"), FaqListResponseSchema),
    );

    if (error) {
      throw new Error(error instanceof ApiError ? error.message : "Failed to load the FAQs");
    }

    if (!data.data) {
      throw new Error("Failed to load the FAQs");
    }

    return data.data;
  });
