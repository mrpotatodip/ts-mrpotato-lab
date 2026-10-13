import { createServerFn } from "@tanstack/react-start";
import { apiClient, ApiError } from "#/lib/api-client";
import { tryCatch } from "#/lib/try-catch";
import { withActiveTenant } from "#/lib/active-tenant";
import { LocationScopeInputSchema, withLocation } from "#/modules/location";
import { BusinessProfileResponseSchema } from "../schemas";

export const fetchBusinessProfile = createServerFn({ method: "GET" })
  .validator(LocationScopeInputSchema)
  .handler(async ({ data: { locationId } }) => {
    const { data, error } = await tryCatch(
      apiClient.get(await withActiveTenant(withLocation("/business-profile", locationId)), BusinessProfileResponseSchema),
    );

    if (error) {
      throw new Error(error instanceof ApiError ? error.message : "Failed to load the profile");
    }

    if (!data.data) {
      throw new Error("Failed to load the profile");
    }

    return data.data;
  });
