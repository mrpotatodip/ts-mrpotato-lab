import { createServerFn } from "@tanstack/react-start";
import { apiClient, ApiError } from "#/lib/api-client";
import { tryCatch } from "#/lib/try-catch";
import { withActiveTenant } from "#/lib/active-tenant";
import { LocationResponseSchema, UpdateLocationInputSchema } from "../schemas";

export const updateLocation = createServerFn({ method: "POST" })
  .validator(UpdateLocationInputSchema)
  .handler(async ({ data: { locationId, ...body } }) => {
    const { data, error } = await tryCatch(
      apiClient.patch(await withActiveTenant(`/locations/${locationId}`), LocationResponseSchema, body),
    );

    if (error) {
      throw new Error(error instanceof ApiError ? error.message : "Failed to save the location");
    }

    if (!data.data) {
      throw new Error("Failed to save the location");
    }

    return data.data;
  });
