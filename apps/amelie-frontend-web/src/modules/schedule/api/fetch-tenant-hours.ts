import { createServerFn } from "@tanstack/react-start";
import { apiClient, ApiError } from "#/lib/api-client";
import { tryCatch } from "#/lib/try-catch";
import { LocationScopeInputSchema, withLocation } from "#/modules/location";
import { withActiveTenant } from "#/lib/active-tenant";
import { TenantHoursResponseSchema } from "../schemas";

export const fetchTenantHours = createServerFn({ method: "GET" })
  .validator(LocationScopeInputSchema)
  .handler(async ({ data: { locationId } }) => {
    const { data, error } = await tryCatch(
      apiClient.get(await withActiveTenant(withLocation("/schedule", locationId)), TenantHoursResponseSchema),
    );

    if (error) {
      throw new Error(error instanceof ApiError ? error.message : "Failed to load the hours");
    }

    if (!data.data) {
      throw new Error("Failed to load the hours");
    }

    return data.data;
  });
