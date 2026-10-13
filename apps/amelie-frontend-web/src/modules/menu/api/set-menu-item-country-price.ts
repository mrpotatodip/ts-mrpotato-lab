import { createServerFn } from "@tanstack/react-start";
import { apiClient, ApiError } from "#/lib/api-client";
import { tryCatch } from "#/lib/try-catch";
import { withActiveTenant } from "#/lib/active-tenant";
import { MenuItemResponseSchema, SetMenuItemCountryPriceInputSchema } from "../schemas";

export const setMenuItemCountryPrice = createServerFn({ method: "POST" })
  .validator(SetMenuItemCountryPriceInputSchema)
  .handler(async ({ data: { itemId, countryId, body } }) => {
    const { data, error } = await tryCatch(
      apiClient.put(await withActiveTenant(`/menu/items/${itemId}/countries/${countryId}`), MenuItemResponseSchema, body),
    );

    if (error) {
      throw new Error(error instanceof ApiError ? error.message : "Failed to save the price");
    }

    if (!data.data) {
      throw new Error("Failed to save the price");
    }

    return data.data;
  });
