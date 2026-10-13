import { createServerFn } from "@tanstack/react-start";
import { CreateLocationBodySchema } from "@repo/contracts/amelie";
import { apiClient, ApiError } from "#/lib/api-client";
import { tryCatch } from "#/lib/try-catch";
import { withActiveTenant } from "#/lib/active-tenant";
import { LocationResponseSchema } from "../schemas";

export const createLocation = createServerFn({ method: "POST" })
  .validator(CreateLocationBodySchema)
  .handler(async ({ data: body }) => {
    const { data, error } = await tryCatch(
      apiClient.post(await withActiveTenant("/locations"), LocationResponseSchema, body),
    );

    if (error) {
      throw new Error(error instanceof ApiError ? error.message : "Failed to add the location");
    }

    if (!data.data) {
      throw new Error("Failed to add the location");
    }

    return data.data;
  });
