import { createServerFn } from "@tanstack/react-start";
import { apiClient, ApiError } from "#/lib/api-client";
import { tryCatch } from "#/lib/try-catch";
import { withActiveTenant } from "#/lib/active-tenant";
import { ImportSummaryResponseSchema } from "../schemas";

export const uploadMenuImport = createServerFn({ method: "POST" })
  .validator((form: FormData) => form)
  .handler(async ({ data: form }) => {
    const { data, error } = await tryCatch(
      apiClient.post(await withActiveTenant("/imports"), ImportSummaryResponseSchema, form),
    );

    if (error) {
      throw new Error(error instanceof ApiError ? error.message : "Failed to upload the menu");
    }

    if (!data.data) {
      throw new Error("Failed to upload the menu");
    }

    return data.data;
  });
