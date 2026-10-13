import { createServerFn } from "@tanstack/react-start";
import { apiClient, ApiError } from "#/lib/api-client";
import { tryCatch } from "#/lib/try-catch";
import { withActiveTenant } from "#/lib/active-tenant";
import { CountryResponseSchema, UpdateCountryInputSchema } from "../schemas";

export const updateCountry = createServerFn({ method: "POST" })
  .validator(UpdateCountryInputSchema)
  .handler(async ({ data: { countryId, ...body } }) => {
    const { data, error } = await tryCatch(
      apiClient.patch(await withActiveTenant(`/countries/${countryId}`), CountryResponseSchema, body),
    );

    if (error) {
      throw new Error(error instanceof ApiError ? error.message : "Failed to save the country");
    }

    if (!data.data) {
      throw new Error("Failed to save the country");
    }

    return data.data;
  });
