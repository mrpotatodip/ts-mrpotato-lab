import { createServerFn } from "@tanstack/react-start";
import { CreateTeamInviteBodySchema } from "@repo/contracts/amelie";
import { apiClient, ApiError } from "#/lib/api-client";
import { tryCatch } from "#/lib/try-catch";
import { withActiveTenant } from "#/lib/active-tenant";
import { CreatedTeamInviteResponseSchema } from "../schemas";

export const createTeamInvite = createServerFn({ method: "POST" })
  .validator(CreateTeamInviteBodySchema)
  .handler(async ({ data: body }) => {
    const { data, error } = await tryCatch(
      apiClient.post(await withActiveTenant("/team/invites"), CreatedTeamInviteResponseSchema, body),
    );

    if (error) {
      throw new Error(error instanceof ApiError ? error.message : "Failed to invite");
    }

    if (!data.data) {
      throw new Error("Failed to invite");
    }

    return data.data;
  });
