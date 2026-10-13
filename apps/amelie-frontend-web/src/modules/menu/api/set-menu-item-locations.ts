import { createServerFn } from "@tanstack/react-start";
import { apiClient, ApiError } from "#/lib/api-client";
import { tryCatch } from "#/lib/try-catch";
import { withActiveTenant } from "#/lib/active-tenant";
import { MenuItemResponseSchema, SetMenuItemLocationsInputSchema } from "../schemas";

export const setMenuItemLocations = createServerFn({ method: "POST" })
  .validator(SetMenuItemLocationsInputSchema)
  .handler(async ({ data: { itemId, body } }) => {
    const { data, error } = await tryCatch(
      apiClient.put(await withActiveTenant(`/menu/items/${itemId}/locations`), MenuItemResponseSchema, body),
    );

    if (error) {
      throw new Error(error instanceof ApiError ? error.message : "Failed to save where the item is sold");
    }

    if (!data.data) {
      throw new Error("Failed to save where the item is sold");
    }

    return data.data;
  });
