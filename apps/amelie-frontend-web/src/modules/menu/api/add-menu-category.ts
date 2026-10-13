import { createServerFn } from "@tanstack/react-start";
import { MenuCategoryBodySchema } from "@repo/contracts/amelie";
import { apiClient, ApiError } from "#/lib/api-client";
import { tryCatch } from "#/lib/try-catch";
import { withActiveTenant } from "#/lib/active-tenant";
import { MenuCategoryResponseSchema } from "../schemas";

export const addMenuCategory = createServerFn({ method: "POST" })
  .validator(MenuCategoryBodySchema)
  .handler(async ({ data: body }) => {
    const { data, error } = await tryCatch(
      apiClient.post(await withActiveTenant("/menu/categories"), MenuCategoryResponseSchema, body),
    );

    if (error) {
      throw new Error(error instanceof ApiError ? error.message : "Failed to save the category");
    }

    if (!data.data) {
      throw new Error("Failed to save the category");
    }

    return data.data;
  });
