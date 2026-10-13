import { createServerFn } from "@tanstack/react-start";
import { apiClient, ApiError } from "#/lib/api-client";
import { tryCatch } from "#/lib/try-catch";
import { withLocation } from "#/modules/location";
import { withActiveTenant } from "#/lib/active-tenant";
import { SetWeeklyHoursInputSchema, WeeklyHoursResponseSchema } from "../schemas";

export const setWeeklyHours = createServerFn({ method: "POST" })
  .validator(SetWeeklyHoursInputSchema)
  .handler(async ({ data: { dayOfWeek, locationId, ...body } }) => {
    const { data, error } = await tryCatch(
      apiClient.put(await withActiveTenant(withLocation(`/schedule/hours/${dayOfWeek}`, locationId)), WeeklyHoursResponseSchema, body),
    );

    if (error) {
      throw new Error(error instanceof ApiError ? error.message : "Failed to save the hours");
    }

    if (!data.data) {
      throw new Error("Failed to save the hours");
    }

    return data.data;
  });
