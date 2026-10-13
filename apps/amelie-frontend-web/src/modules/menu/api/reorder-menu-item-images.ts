import { createServerFn } from "@tanstack/react-start";
import { apiClient, ApiError } from "#/lib/api-client";
import { tryCatch } from "#/lib/try-catch";
import { withActiveTenant } from "#/lib/active-tenant";
import { MenuItemImagesResponseSchema, ReorderMenuItemImagesInputSchema } from "../schemas";

export const reorderMenuItemImages = createServerFn({ method: "POST" })
  .validator(ReorderMenuItemImagesInputSchema)
  .handler(async ({ data: { itemId, ...body } }) => {
    const { data, error } = await tryCatch(
      apiClient.put(await withActiveTenant(`/menu/items/${itemId}/images/order`), MenuItemImagesResponseSchema, body),
    );

    if (error) {
      throw new Error(error instanceof ApiError ? error.message : "Failed to rearrange the photos");
    }

    if (!data.data) {
      throw new Error("Failed to rearrange the photos");
    }

    return data.data;
  });
