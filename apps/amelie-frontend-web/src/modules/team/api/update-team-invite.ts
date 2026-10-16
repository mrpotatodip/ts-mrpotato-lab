import { createServerFn } from "@tanstack/react-start";
import { TeamInviteParamSchema, TeamRoleBodySchema } from "@repo/contracts/amelie";
import { apiClient, ApiError } from "#/lib/api-client";
import { tryCatch } from "#/lib/try-catch";
import { withActiveTenant } from "#/lib/active-tenant";
import { TeamInviteResponseSchema } from "../schemas";

export const updateTeamInvite = createServerFn({ method: "POST" })
  .validator(TeamInviteParamSchema.merge(TeamRoleBodySchema))
  .handler(async ({ data: { inviteId, role } }) => {
    const { data, error } = await tryCatch(
      apiClient.patch(await withActiveTenant(`/team/invites/${inviteId}`), TeamInviteResponseSchema, { role }),
    );

    if (error) {
      throw new Error(error instanceof ApiError ? error.message : "Failed to update the invite");
    }

    if (!data.data) {
      throw new Error("Failed to update the invite");
    }

    return data.data;
  });
