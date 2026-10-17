import { createServerFn } from "@tanstack/react-start";
import { apiClient, ApiError } from "#/lib/api-client";
import { tryCatch } from "#/lib/try-catch";
import { AdminRoleDetailResponseSchema, SetAdminRoleEnabledInputSchema } from "../schemas";

export const setAdminRoleEnabled = createServerFn({ method: "POST" })
  .validator(SetAdminRoleEnabledInputSchema)
  .handler(async ({ data: { roleId, body } }) => {
    const { data, error } = await tryCatch(
      apiClient.put(`/admin/roles/${roleId}/enabled`, AdminRoleDetailResponseSchema, body),
    );

    if (error) {
      throw new Error(error instanceof ApiError ? error.message : "Failed to change the role");
    }

    if (!data.data) {
      throw new Error("Failed to change the role");
    }

    return data.data;
  });
