import { createServerFn } from "@tanstack/react-start";
import { apiClient, ApiError } from "#/lib/api-client";
import { tryCatch } from "#/lib/try-catch";
import { withLocation } from "#/modules/location";
import { withActiveTenant } from "#/lib/active-tenant";
import { SetSpecialDateInputSchema, SpecialDateResponseSchema } from "../schemas";

export const setSpecialDate = createServerFn({ method: "POST" })
  .validator(SetSpecialDateInputSchema)
  .handler(async ({ data: { date, locationId, ...body } }) => {
    const { data, error } = await tryCatch(
      apiClient.put(await withActiveTenant(withLocation(`/schedule/overrides/${date}`, locationId)), SpecialDateResponseSchema, body),
    );

    if (error) {
      throw new Error(error instanceof ApiError ? error.message : "Failed to save the special date");
    }

    if (!data.data) {
      throw new Error("Failed to save the special date");
    }

    return data.data;
  });
