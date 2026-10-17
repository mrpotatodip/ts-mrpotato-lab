import { createServerFn } from "@tanstack/react-start";
import { CreateAdminRoleBodySchema } from "@repo/contracts/amelie";
import { apiClient, ApiError } from "#/lib/api-client";
import { tryCatch } from "#/lib/try-catch";
import { AdminRoleDetailResponseSchema } from "../schemas";

export const createAdminRole = createServerFn({ method: "POST" })
  .validator(CreateAdminRoleBodySchema)
  .handler(async ({ data: body }) => {
    const { data, error } = await tryCatch(
      apiClient.post("/admin/roles", AdminRoleDetailResponseSchema, body),
    );

    if (error) {
      throw new Error(error instanceof ApiError ? error.message : "Failed to create the role");
    }

    if (!data.data) {
      throw new Error("Failed to create the role");
    }

    return data.data;
  });
