import { createServerFn } from "@tanstack/react-start";
import { apiClient, ApiError } from "#/lib/api-client";
import { tryCatch } from "#/lib/try-catch";
import { TenantResponseSchema, UpdateTenantAllowedOriginsInputSchema } from "../schemas";

export const updateTenantAllowedOrigins = createServerFn({ method: "POST" })
  .validator(UpdateTenantAllowedOriginsInputSchema)
  .handler(async ({ data: { tenantId, allowedOrigins } }) => {
    const { data, error } = await tryCatch(
      apiClient.put(`/tenants/${tenantId}/allowed-origins`, TenantResponseSchema, { allowedOrigins }),
    );

    if (error) {
      throw new Error(error instanceof ApiError ? error.message : "Failed to save Allowed origins");
    }

    if (!data.data) {
      throw new Error("Failed to save Allowed origins");
    }

    return data.data;
  });
