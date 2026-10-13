import { createServerFn } from "@tanstack/react-start";
import { apiClient, ApiError } from "#/lib/api-client";
import { tryCatch } from "#/lib/try-catch";
import { withActiveTenant } from "#/lib/active-tenant";
import { ImportListResponseSchema } from "../schemas";

export const fetchMenuImports = createServerFn({ method: "GET" })
  .handler(async () => {
    const { data, error } = await tryCatch(
      apiClient.get(await withActiveTenant("/imports"), ImportListResponseSchema),
    );

    if (error) {
      throw new Error(error instanceof ApiError ? error.message : "Failed to load the imports");
    }

    if (!data.data) {
      throw new Error("Failed to load the imports");
    }

    return data.data;
  });
