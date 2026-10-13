import { createServerFn } from "@tanstack/react-start";
import { apiClient, ApiError } from "#/lib/api-client";
import { tryCatch } from "#/lib/try-catch";
import { withActiveTenant } from "#/lib/active-tenant";
import { CountryListResponseSchema } from "../schemas";

export const fetchCountries = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await tryCatch(
    apiClient.get(await withActiveTenant("/countries"), CountryListResponseSchema),
  );

  if (error) {
    throw new Error(error instanceof ApiError ? error.message : "Failed to load the countries");
  }

  if (!data.data) {
    throw new Error("Failed to load the countries");
  }

  return data.data;
});
