import { createServerFn } from "@tanstack/react-start";
import { apiClient, ApiError } from "#/lib/api-client";
import { tryCatch } from "#/lib/try-catch";
import { withActiveTenant } from "#/lib/active-tenant";
import { withLocation } from "#/modules/location";
import { BusinessProfileResponseSchema, UpdateBusinessProfileInputSchema } from "../schemas";

export const updateBusinessProfile = createServerFn({ method: "POST" })
  .validator(UpdateBusinessProfileInputSchema)
  .handler(async ({ data: { locationId, ...body } }) => {
    const { data, error } = await tryCatch(
      apiClient.put(
        await withActiveTenant(withLocation("/business-profile", locationId)),
        BusinessProfileResponseSchema,
        body,
      ),
    );

    if (error) {
      throw new Error(error instanceof ApiError ? error.message : "Failed to save the profile");
    }

    if (!data.data) {
      throw new Error("Failed to save the profile");
    }

    return data.data;
  });
