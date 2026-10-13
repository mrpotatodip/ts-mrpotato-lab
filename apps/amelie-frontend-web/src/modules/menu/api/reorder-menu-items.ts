import { createServerFn } from "@tanstack/react-start";
import { apiClient, ApiError } from "#/lib/api-client";
import { tryCatch } from "#/lib/try-catch";
import { withActiveTenant } from "#/lib/active-tenant";
import { MenuCategoriesResponseSchema, ReorderMenuItemsInputSchema } from "../schemas";

export const reorderMenuItems = createServerFn({ method: "POST" })
  .validator(ReorderMenuItemsInputSchema)
  .handler(async ({ data: { categoryId, ...body } }) => {
    const { data, error } = await tryCatch(
      apiClient.put(await withActiveTenant(`/menu/categories/${categoryId}/items/order`), MenuCategoriesResponseSchema, body),
    );

    if (error) {
      throw new Error(error instanceof ApiError ? error.message : "Failed to reorder the items");
    }

    if (!data.data) {
      throw new Error("Failed to reorder the items");
    }

    return data.data;
  });
