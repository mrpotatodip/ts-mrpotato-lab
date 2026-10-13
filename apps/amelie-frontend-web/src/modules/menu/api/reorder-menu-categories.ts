import { createServerFn } from "@tanstack/react-start";
import { apiClient, ApiError } from "#/lib/api-client";
import { tryCatch } from "#/lib/try-catch";
import { withActiveTenant } from "#/lib/active-tenant";
import { MenuCategoriesResponseSchema, ReorderMenuCategoriesInputSchema } from "../schemas";

export const reorderMenuCategories = createServerFn({ method: "POST" })
  .validator(ReorderMenuCategoriesInputSchema)
  .handler(async ({ data: body }) => {
    const { data, error } = await tryCatch(
      apiClient.put(await withActiveTenant("/menu/categories/order"), MenuCategoriesResponseSchema, body),
    );

    if (error) {
      throw new Error(error instanceof ApiError ? error.message : "Failed to reorder the categories");
    }

    if (!data.data) {
      throw new Error("Failed to reorder the categories");
    }

    return data.data;
  });
