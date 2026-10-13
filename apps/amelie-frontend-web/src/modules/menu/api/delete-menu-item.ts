import { createServerFn } from "@tanstack/react-start";
import { apiClient, ApiError } from "#/lib/api-client";
import { tryCatch } from "#/lib/try-catch";
import { withActiveTenant } from "#/lib/active-tenant";
import { DeleteMenuItemInputSchema, MenuDeletedResponseSchema } from "../schemas";

export const deleteMenuItem = createServerFn({ method: "POST" })
  .validator(DeleteMenuItemInputSchema)
  .handler(async ({ data: { itemId } }) => {
    const { data, error } = await tryCatch(
      apiClient.delete(await withActiveTenant(`/menu/items/${itemId}`), MenuDeletedResponseSchema),
    );

    if (error) {
      throw new Error(error instanceof ApiError ? error.message : "Failed to delete the item");
    }

    if (!data.data) {
      throw new Error("Failed to delete the item");
    }

    return data.data;
  });
