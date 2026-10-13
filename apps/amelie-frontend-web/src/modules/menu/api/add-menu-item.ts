import { createServerFn } from "@tanstack/react-start";
import { MenuItemBodySchema } from "@repo/contracts/amelie";
import { apiClient, ApiError } from "#/lib/api-client";
import { tryCatch } from "#/lib/try-catch";
import { withActiveTenant } from "#/lib/active-tenant";
import { MenuItemResponseSchema } from "../schemas";

export const addMenuItem = createServerFn({ method: "POST" })
  .validator(MenuItemBodySchema)
  .handler(async ({ data: body }) => {
    const { data, error } = await tryCatch(
      apiClient.post(await withActiveTenant("/menu/items"), MenuItemResponseSchema, body),
    );

    if (error) {
      throw new Error(error instanceof ApiError ? error.message : "Failed to save the item");
    }

    if (!data.data) {
      throw new Error("Failed to save the item");
    }

    return data.data;
  });
