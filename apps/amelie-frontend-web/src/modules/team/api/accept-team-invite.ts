import { createServerFn } from "@tanstack/react-start";
import { AcceptTeamInviteBodySchema, TeamInviteTokenParamSchema } from "@repo/contracts/amelie";
import { apiClient, ApiError } from "#/lib/api-client";
import { tryCatch } from "#/lib/try-catch";
import { AcceptedTeamInviteResponseSchema } from "../schemas";

export const acceptTeamInvite = createServerFn({ method: "POST" })
  .validator(TeamInviteTokenParamSchema.merge(AcceptTeamInviteBodySchema))
  .handler(async ({ data: { token, ...body } }) => {
    const { data, error } = await tryCatch(
      apiClient.post(
        `/public/team-invites/${encodeURIComponent(token)}/accept`,
        AcceptedTeamInviteResponseSchema,
        body,
      ),
    );

    if (error) {
      throw new Error(error instanceof ApiError ? error.message : "Failed to join");
    }

    if (!data.data) {
      throw new Error("Failed to join");
    }

    return data.data;
  });
