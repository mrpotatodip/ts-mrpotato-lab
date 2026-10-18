import { createServerFn } from "@tanstack/react-start";
import { apiClient, ApiError } from "#/lib/api-client";
import { tryCatch } from "#/lib/try-catch";
import { withActiveTenant } from "#/lib/active-tenant";
import { ArchiveLocationInputSchema, LocationArchivePreviewResponseSchema } from "../schemas";

export const fetchLocationArchivePreview = createServerFn({ method: "GET" })
  .validator(ArchiveLocationInputSchema)
  .handler(async ({ data: { locationId } }) => {
    const { data, error } = await tryCatch(
      apiClient.get(await withActiveTenant(`/locations/${locationId}/archive-preview`), LocationArchivePreviewResponseSchema),
    );

    if (error) {
      throw new Error(error instanceof ApiError ? error.message : "Failed to check who the archive affects");
    }

    if (!data.data) {
      throw new Error("Failed to check who the archive affects");
    }

    return data.data;
  });
