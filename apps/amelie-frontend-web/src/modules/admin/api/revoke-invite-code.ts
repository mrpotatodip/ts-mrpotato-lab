import { createServerFn } from "@tanstack/react-start";
import { InviteCodeParamSchema } from "@repo/contracts/amelie";
import { apiClient, ApiError } from "#/lib/api-client";
import { tryCatch } from "#/lib/try-catch";
import { InviteCodeResponseSchema } from "../schemas";

export const revokeInviteCode = createServerFn({ method: "POST" })
  .validator(InviteCodeParamSchema)
  .handler(async ({ data: { id } }) => {
    const { data, error } = await tryCatch(
      apiClient.post(`/admin/invite-codes/${id}/revoke`, InviteCodeResponseSchema),
    );

    if (error) {
      throw new Error(error instanceof ApiError ? error.message : "Failed to revoke the invite code");
    }

    if (!data.data) {
      throw new Error("Failed to revoke the invite code");
    }

    return data.data;
  });
