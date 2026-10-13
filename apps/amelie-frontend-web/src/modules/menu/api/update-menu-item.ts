import { createServerFn } from "@tanstack/react-start";
import { apiClient, ApiError } from "#/lib/api-client";
import { tryCatch } from "#/lib/try-catch";
import { withActiveTenant } from "#/lib/active-tenant";
import { MenuItemResponseSchema, UpdateMenuItemInputSchema } from "../schemas";

export const updateMenuItem = createServerFn({ method: "POST" })
  .validator(UpdateMenuItemInputSchema)
  .handler(async ({ data: { itemId, body } }) => {
    const { data, error } = await tryCatch(
      apiClient.put(await withActiveTenant(`/menu/items/${itemId}`), MenuItemResponseSchema, body),
    );

    if (error) {
      throw new Error(error instanceof ApiError ? error.message : "Failed to save the item");
    }

    if (!data.data) {
      throw new Error("Failed to save the item");
    }

    return data.data;
  });
