import { createServerFn } from "@tanstack/react-start";
import { AdminRoleParamSchema } from "@repo/contracts/amelie";
import { apiClient, ApiError } from "#/lib/api-client";
import { tryCatch } from "#/lib/try-catch";
import { ADMIN_AUDIT_ENTRY_LIMIT } from "../constants";
import { AdminAuditLogResponseSchema } from "../schemas";

export const fetchAdminRoleAuditLog = createServerFn({ method: "GET" })
  .validator(AdminRoleParamSchema)
  .handler(async ({ data: { roleId } }) => {
    const { data, error } = await tryCatch(
      apiClient.get(
        `/admin/role-audit-log?roleId=${roleId}&limit=${ADMIN_AUDIT_ENTRY_LIMIT}`,
        AdminAuditLogResponseSchema,
      ),
    );

    if (error) {
      throw new Error(error instanceof ApiError ? error.message : "Failed to load the history");
    }

    if (!data.data) {
      throw new Error("Failed to load the history");
    }

    return data.data;
  });
