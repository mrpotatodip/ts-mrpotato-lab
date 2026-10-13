import { createServerFn } from "@tanstack/react-start";
import { CreateCountryBodySchema } from "@repo/contracts/amelie";
import { apiClient, ApiError } from "#/lib/api-client";
import { tryCatch } from "#/lib/try-catch";
import { withActiveTenant } from "#/lib/active-tenant";
import { CountryResponseSchema } from "../schemas";

export const createCountry = createServerFn({ method: "POST" })
  .validator(CreateCountryBodySchema)
  .handler(async ({ data: body }) => {
    const { data, error } = await tryCatch(
      apiClient.post(await withActiveTenant("/countries"), CountryResponseSchema, body),
    );

    if (error) {
      throw new Error(error instanceof ApiError ? error.message : "Failed to add the country");
    }

    if (!data.data) {
      throw new Error("Failed to add the country");
    }

    return data.data;
  });
