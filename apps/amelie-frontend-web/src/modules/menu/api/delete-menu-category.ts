import { createServerFn } from "@tanstack/react-start";
import { apiClient, ApiError } from "#/lib/api-client";
import { tryCatch } from "#/lib/try-catch";
import { withActiveTenant } from "#/lib/active-tenant";
import { DeleteMenuCategoryInputSchema, MenuDeletedResponseSchema } from "../schemas";

export const deleteMenuCategory = createServerFn({ method: "POST" })
  .validator(DeleteMenuCategoryInputSchema)
  .handler(async ({ data: { categoryId } }) => {
    const { data, error } = await tryCatch(
      apiClient.delete(await withActiveTenant(`/menu/categories/${categoryId}`), MenuDeletedResponseSchema),
    );

    if (error) {
      throw new Error(error instanceof ApiError ? error.message : "Failed to delete the category");
    }

    if (!data.data) {
      throw new Error("Failed to delete the category");
    }

    return data.data;
  });
