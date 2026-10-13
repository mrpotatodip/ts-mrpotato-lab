import { createServerFn } from "@tanstack/react-start";
import { apiClient, ApiError } from "#/lib/api-client";
import { tryCatch } from "#/lib/try-catch";
import { UpdateTenantRegionInputSchema, TenantResponseSchema } from "../schemas";

export const updateTenantRegion = createServerFn({ method: "POST" })
  .validator(UpdateTenantRegionInputSchema)
  .handler(async ({ data: { tenantId, country, currency } }) => {
    const { data, error } = await tryCatch(
      apiClient.patch(`/tenants/${tenantId}/region`, TenantResponseSchema, { country, currency }),
    );

    if (error) {
      throw new Error(error instanceof ApiError ? error.message : "Failed to save the region");
    }

    if (!data.data) {
      throw new Error("Failed to save the region");
    }

    return data.data;
  });
