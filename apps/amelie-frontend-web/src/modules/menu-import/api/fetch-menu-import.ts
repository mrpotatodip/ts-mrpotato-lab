import { createServerFn } from "@tanstack/react-start";
import { apiClient, ApiError } from "#/lib/api-client";
import { tryCatch } from "#/lib/try-catch";
import { withActiveTenant } from "#/lib/active-tenant";
import { FetchImportInputSchema, ImportDetailResponseSchema } from "../schemas";

export const fetchMenuImport = createServerFn({ method: "GET" })
  .validator(FetchImportInputSchema)
  .handler(async ({ data: { importId } }) => {
    const { data, error } = await tryCatch(
      apiClient.get(await withActiveTenant(`/imports/${importId}`), ImportDetailResponseSchema),
    );

    if (error) {
      throw new Error(error instanceof ApiError ? error.message : "Failed to load the import");
    }

    if (!data.data) {
      throw new Error("Failed to load the import");
    }

    return data.data;
  });
