import { createServerFn } from "@tanstack/react-start";
import { TeamInviteTokenParamSchema } from "@repo/contracts/amelie";
import { apiClient, ApiError } from "#/lib/api-client";
import { tryCatch } from "#/lib/try-catch";
import { TeamInvitePreviewResponseSchema } from "../schemas";

export const fetchTeamInvitePreview = createServerFn({ method: "GET" })
  .validator(TeamInviteTokenParamSchema)
  .handler(async ({ data: { token } }) => {
    const { data, error } = await tryCatch(
      apiClient.get(`/public/team-invites/${encodeURIComponent(token)}`, TeamInvitePreviewResponseSchema),
    );

    if (error) {
      throw new Error(error instanceof ApiError ? error.message : "This invite is no longer valid.");
    }

    if (!data.data) {
      throw new Error("This invite is no longer valid.");
    }

    return data.data;
  });
