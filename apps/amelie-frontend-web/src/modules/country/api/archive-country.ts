import { createServerFn } from "@tanstack/react-start";
import { apiClient, ApiError } from "#/lib/api-client";
import { tryCatch } from "#/lib/try-catch";
import { withActiveTenant } from "#/lib/active-tenant";
import { ArchiveCountryInputSchema, CountryArchivedResponseSchema } from "../schemas";

export const archiveCountry = createServerFn({ method: "POST" })
  .validator(ArchiveCountryInputSchema)
  .handler(async ({ data: { countryId } }) => {
    const { data, error } = await tryCatch(
      apiClient.post(await withActiveTenant(`/countries/${countryId}/archive`), CountryArchivedResponseSchema),
    );

    if (error) {
      throw new Error(error instanceof ApiError ? error.message : "Failed to archive the country");
    }

    if (!data.data) {
      throw new Error("Failed to archive the country");
    }

    return data.data;
  });
