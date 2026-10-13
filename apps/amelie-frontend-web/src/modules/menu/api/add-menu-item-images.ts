import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { apiClient, ApiError } from "#/lib/api-client";
import { tryCatch } from "#/lib/try-catch";
import { withActiveTenant } from "#/lib/active-tenant";
import { MenuItemImagesResponseSchema } from "../schemas";

export const addMenuItemImages = createServerFn({ method: "POST" })
  .validator((form: FormData) => form)
  .handler(async ({ data: form }) => {
    const itemId = z.uuid().parse(form.get("itemId"));
    const body = new FormData();
    for (const file of form.getAll("files")) {
      if (file instanceof File) body.append("files", file);
    }

    const { data, error } = await tryCatch(
      apiClient.post(await withActiveTenant(`/menu/items/${itemId}/images`), MenuItemImagesResponseSchema, body),
    );

    if (error) {
      throw new Error(error instanceof ApiError ? error.message : "Failed to add the photos");
    }

    if (!data.data) {
      throw new Error("Failed to add the photos");
    }

    return data.data;
  });
