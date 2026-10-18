import { createServerFn } from "@tanstack/react-start";
import { TeamListSchema, TeamMemberParamSchema, UpdateTeamMemberBodySchema } from "@repo/contracts/amelie";
import { apiClient, ApiError } from "#/lib/api-client";
import { tryCatch } from "#/lib/try-catch";
import { withActiveTenant } from "#/lib/active-tenant";
import { apiResponseSchema } from "#/lib/api-response-schema";

export const updateTeamMember = createServerFn({ method: "POST" })
  .validator(TeamMemberParamSchema.merge(UpdateTeamMemberBodySchema))
  .handler(async ({ data: { partyId, ...body } }) => {
    const { data, error } = await tryCatch(
      apiClient.patch(await withActiveTenant(`/team/members/${partyId}`), apiResponseSchema(TeamListSchema), body),
    );

    if (error) {
      throw new Error(error instanceof ApiError ? error.message : "Failed to save the member");
    }

    if (!data.data) {
      throw new Error("Failed to save the member");
    }

    return data.data;
  });
