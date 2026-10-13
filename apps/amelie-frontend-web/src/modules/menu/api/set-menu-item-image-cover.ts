import { createServerFn } from "@tanstack/react-start";
import { apiClient, ApiError } from "#/lib/api-client";
import { tryCatch } from "#/lib/try-catch";
import { withActiveTenant } from "#/lib/active-tenant";
import { MenuItemImagesResponseSchema, SetMenuItemImageCoverInputSchema } from "../schemas";

export const setMenuItemImageCover = createServerFn({ method: "POST" })
  .validator(SetMenuItemImageCoverInputSchema)
  .handler(async ({ data: { itemId, imageId } }) => {
    const { data, error } = await tryCatch(
      apiClient.put(await withActiveTenant(`/menu/items/${itemId}/images/${imageId}/cover`), MenuItemImagesResponseSchema),
    );

    if (error) {
      throw new Error(error instanceof ApiError ? error.message : "Failed to set the cover photo");
    }

    if (!data.data) {
      throw new Error("Failed to set the cover photo");
    }

    return data.data;
  });
