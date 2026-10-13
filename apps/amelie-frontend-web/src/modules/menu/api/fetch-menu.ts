import { createServerFn } from "@tanstack/react-start";
import { apiClient, ApiError } from "#/lib/api-client";
import { tryCatch } from "#/lib/try-catch";
import { withActiveTenant } from "#/lib/active-tenant";
import { withCountry } from "#/modules/country";
import { MenuEditorResponseSchema, MenuScopeInputSchema } from "../schemas";

export const fetchMenu = createServerFn({ method: "GET" })
  .validator(MenuScopeInputSchema)
  .handler(async ({ data: { countryId } }) => {
    const { data, error } = await tryCatch(
      apiClient.get(await withActiveTenant(withCountry("/menu", countryId)), MenuEditorResponseSchema),
    );

    if (error) {
      throw new Error(error instanceof ApiError ? error.message : "Failed to load the menu");
    }

    if (!data.data) {
      throw new Error("Failed to load the menu");
    }

    return data.data;
  });
