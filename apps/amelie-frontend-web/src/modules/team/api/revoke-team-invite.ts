import { createServerFn } from "@tanstack/react-start";
import { TeamInviteParamSchema } from "@repo/contracts/amelie";
import { apiClient, ApiError } from "#/lib/api-client";
import { tryCatch } from "#/lib/try-catch";
import { withActiveTenant } from "#/lib/active-tenant";
import { TeamDeletedResponseSchema } from "../schemas";

export const revokeTeamInvite = createServerFn({ method: "POST" })
  .validator(TeamInviteParamSchema)
  .handler(async ({ data: { inviteId } }) => {
    const { data, error } = await tryCatch(
      apiClient.delete(await withActiveTenant(`/team/invites/${inviteId}`), TeamDeletedResponseSchema),
    );

    if (error) {
      throw new Error(error instanceof ApiError ? error.message : "Failed to revoke the invite");
    }

    if (!data.data) {
      throw new Error("Failed to revoke the invite");
    }

    return data.data;
  });
