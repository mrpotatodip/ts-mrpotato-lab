import { createServerFn } from "@tanstack/react-start";
import { apiClient, ApiError } from "#/lib/api-client";
import { tryCatch } from "#/lib/try-catch";
import { withActiveTenant } from "#/lib/active-tenant";
import { ArchiveLocationInputSchema, LocationArchivedResponseSchema } from "../schemas";

export const archiveLocation = createServerFn({ method: "POST" })
  .validator(ArchiveLocationInputSchema)
  .handler(async ({ data: { locationId } }) => {
    const { data, error } = await tryCatch(
      apiClient.post(await withActiveTenant(`/locations/${locationId}/archive`), LocationArchivedResponseSchema),
    );

    if (error) {
      throw new Error(error instanceof ApiError ? error.message : "Failed to archive the location");
    }

    if (!data.data) {
      throw new Error("Failed to archive the location");
    }

    return data.data;
  });
