import { createServerFn } from "@tanstack/react-start";
import { apiClient, ApiError } from "#/lib/api-client";
import { tryCatch } from "#/lib/try-catch";
import { TenantResponseSchema, UpdateTenantCustomerChatInputSchema } from "../schemas";

export const updateTenantCustomerChat = createServerFn({ method: "POST" })
  .validator(UpdateTenantCustomerChatInputSchema)
  .handler(async ({ data: { tenantId, customerChatLabel, customerChatAccent } }) => {
    const { data, error } = await tryCatch(
      apiClient.put(`/tenants/${tenantId}/customer-chat`, TenantResponseSchema, {
        customerChatLabel,
        customerChatAccent,
      }),
    );

    if (error) {
      throw new Error(error instanceof ApiError ? error.message : "Failed to save the chat look");
    }

    if (!data.data) {
      throw new Error("Failed to save the chat look");
    }

    return data.data;
  });
