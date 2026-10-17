import { createServerFn } from "@tanstack/react-start";
import { apiClient, ApiError } from "#/lib/api-client";
import { tryCatch } from "#/lib/try-catch";
import { AdminRoleDetailResponseSchema, SetAdminRolePowersInputSchema } from "../schemas";

export const setAdminRolePowers = createServerFn({ method: "POST" })
  .validator(SetAdminRolePowersInputSchema)
  .handler(async ({ data: { roleId, body } }) => {
    const { data, error } = await tryCatch(
      apiClient.put(`/admin/roles/${roleId}/powers`, AdminRoleDetailResponseSchema, body),
    );

    if (error) {
      throw new Error(error instanceof ApiError ? error.message : "Failed to save the powers");
    }

    if (!data.data) {
      throw new Error("Failed to save the powers");
    }

    return data.data;
  });
