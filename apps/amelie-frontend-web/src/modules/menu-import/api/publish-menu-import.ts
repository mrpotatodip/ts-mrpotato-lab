import { createServerFn } from "@tanstack/react-start";
import { apiClient, ApiError } from "#/lib/api-client";
import { tryCatch } from "#/lib/try-catch";
import { withActiveTenant } from "#/lib/active-tenant";
import { PublishImportInputSchema, PublishedImportResponseSchema } from "../schemas";

export const publishMenuImport = createServerFn({ method: "POST" })
  .validator(PublishImportInputSchema)
  .handler(async ({ data: { importId, mode, locationId, countryId } }) => {
    const { data, error } = await tryCatch(
      apiClient.post(await withActiveTenant(`/imports/${importId}/publish`), PublishedImportResponseSchema, { mode, locationId, countryId }),
    );

    if (error) {
      throw new Error(error instanceof ApiError ? error.message : "Failed to publish the import");
    }

    if (!data.data) {
      throw new Error("Failed to publish the import");
    }

    return data.data;
  });
