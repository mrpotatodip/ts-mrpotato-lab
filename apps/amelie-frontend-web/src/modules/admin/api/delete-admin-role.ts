import { createServerFn } from "@tanstack/react-start";
import { AdminRoleParamSchema } from "@repo/contracts/amelie";
import { apiClient, ApiError } from "#/lib/api-client";
import { tryCatch } from "#/lib/try-catch";
import { AdminRoleDeletedResponseSchema } from "../schemas";

export const deleteAdminRole = createServerFn({ method: "POST" })
  .validator(AdminRoleParamSchema)
  .handler(async ({ data: { roleId } }) => {
    const { data, error } = await tryCatch(
      apiClient.delete(`/admin/roles/${roleId}`, AdminRoleDeletedResponseSchema),
    );

    if (error) {
      throw new Error(error instanceof ApiError ? error.message : "Failed to delete the role");
    }

    if (!data.data) {
      throw new Error("Failed to delete the role");
    }

    return data.data;
  });
