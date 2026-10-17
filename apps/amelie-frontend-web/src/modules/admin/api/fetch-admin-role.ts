import { createServerFn } from "@tanstack/react-start";
import { AdminRoleParamSchema } from "@repo/contracts/amelie";
import { apiClient, ApiError } from "#/lib/api-client";
import { tryCatch } from "#/lib/try-catch";
import { AdminRoleDetailResponseSchema } from "../schemas";

export const fetchAdminRole = createServerFn({ method: "GET" })
  .validator(AdminRoleParamSchema)
  .handler(async ({ data: { roleId } }) => {
    const { data, error } = await tryCatch(
      apiClient.get(`/admin/roles/${roleId}`, AdminRoleDetailResponseSchema),
    );

    if (error) {
      throw new Error(error instanceof ApiError ? error.message : "Failed to load the role");
    }

    if (!data.data) {
      throw new Error("Failed to load the role");
    }

    return data.data;
  });
