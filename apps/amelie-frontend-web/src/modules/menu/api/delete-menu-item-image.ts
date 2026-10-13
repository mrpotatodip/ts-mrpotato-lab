import { createServerFn } from "@tanstack/react-start";
import { apiClient, ApiError } from "#/lib/api-client";
import { tryCatch } from "#/lib/try-catch";
import { withActiveTenant } from "#/lib/active-tenant";
import { DeleteMenuItemImageInputSchema, MenuDeletedResponseSchema } from "../schemas";

export const deleteMenuItemImage = createServerFn({ method: "POST" })
  .validator(DeleteMenuItemImageInputSchema)
  .handler(async ({ data: { itemId, imageId } }) => {
    const { data, error } = await tryCatch(
      apiClient.delete(await withActiveTenant(`/menu/items/${itemId}/images/${imageId}`), MenuDeletedResponseSchema),
    );

    if (error) {
      throw new Error(error instanceof ApiError ? error.message : "Failed to delete the photo");
    }

    if (!data.data) {
      throw new Error("Failed to delete the photo");
    }

    return data.data;
  });
