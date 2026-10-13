import { createServerFn } from "@tanstack/react-start";
import { apiClient, ApiError } from "#/lib/api-client";
import { tryCatch } from "#/lib/try-catch";
import { withActiveTenant } from "#/lib/active-tenant";
import { CustomerThreadDetailResponseSchema, FetchCustomerThreadInputSchema } from "../schemas";

export const fetchCustomerThread = createServerFn({ method: "GET" })
  .validator(FetchCustomerThreadInputSchema)
  .handler(async ({ data: { threadId } }) => {
    const { data, error } = await tryCatch(
      apiClient.get(await withActiveTenant(`/customer-threads/${threadId}`), CustomerThreadDetailResponseSchema),
    );

    if (error) {
      throw new Error(error instanceof ApiError ? error.message : "Failed to load the chat");
    }

    if (!data.data) {
      throw new Error("Failed to load the chat");
    }

    return data.data;
  });
