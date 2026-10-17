import { createServerFn } from "@tanstack/react-start";
import { apiClient, ApiError } from "#/lib/api-client";
import { tryCatch } from "#/lib/try-catch";
import { AdminRoleDetailResponseSchema, UpdateAdminRoleInputSchema } from "../schemas";

export const updateAdminRole = createServerFn({ method: "POST" })
  .validator(UpdateAdminRoleInputSchema)
  .handler(async ({ data: { roleId, body } }) => {
    const { data, error } = await tryCatch(
      apiClient.patch(`/admin/roles/${roleId}`, AdminRoleDetailResponseSchema, body),
    );

    if (error) {
      throw new Error(error instanceof ApiError ? error.message : "Failed to save the role");
    }

    if (!data.data) {
      throw new Error("Failed to save the role");
    }

    return data.data;
  });
