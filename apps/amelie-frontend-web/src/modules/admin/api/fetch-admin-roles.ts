import { createServerFn } from "@tanstack/react-start";
import { apiClient, ApiError } from "#/lib/api-client";
import { tryCatch } from "#/lib/try-catch";
import { AdminRoleListResponseSchema } from "../schemas";

export const fetchAdminRoles = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await tryCatch(apiClient.get("/admin/roles", AdminRoleListResponseSchema));

  if (error) {
    throw new Error(error instanceof ApiError ? error.message : "Failed to load the roles");
  }

  if (!data.data) {
    throw new Error("Failed to load the roles");
  }

  return data.data;
});
