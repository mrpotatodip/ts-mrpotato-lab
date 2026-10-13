import { createServerFn } from "@tanstack/react-start";
import { apiClient, ApiError } from "#/lib/api-client";
import { tryCatch } from "#/lib/try-catch";
import { withLocation } from "#/modules/location";
import { withActiveTenant } from "#/lib/active-tenant";
import { RemoveSpecialDateInputSchema, RemovedSpecialDateResponseSchema } from "../schemas";

export const removeSpecialDate = createServerFn({ method: "POST" })
  .validator(RemoveSpecialDateInputSchema)
  .handler(async ({ data: { date, locationId } }) => {
    const { data, error } = await tryCatch(
      apiClient.delete(await withActiveTenant(withLocation(`/schedule/overrides/${date}`, locationId)), RemovedSpecialDateResponseSchema),
    );

    if (error) {
      throw new Error(error instanceof ApiError ? error.message : "Failed to remove the special date");
    }

    if (!data.data) {
      throw new Error("Failed to remove the special date");
    }

    return data.data;
  });
