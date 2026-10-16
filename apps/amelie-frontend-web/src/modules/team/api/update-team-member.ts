import { createServerFn } from "@tanstack/react-start";
import { TeamListSchema, TeamMemberParamSchema, TeamRoleBodySchema } from "@repo/contracts/amelie";
import { apiClient, ApiError } from "#/lib/api-client";
import { tryCatch } from "#/lib/try-catch";
import { withActiveTenant } from "#/lib/active-tenant";
import { apiResponseSchema } from "#/lib/api-response-schema";

export const updateTeamMember = createServerFn({ method: "POST" })
  .validator(TeamMemberParamSchema.merge(TeamRoleBodySchema))
  .handler(async ({ data: { partyId, role } }) => {
    const { data, error } = await tryCatch(
      apiClient.patch(await withActiveTenant(`/team/members/${partyId}`), apiResponseSchema(TeamListSchema), { role }),
    );

    if (error) {
      throw new Error(error instanceof ApiError ? error.message : "Failed to change the role");
    }

    if (!data.data) {
      throw new Error("Failed to change the role");
    }

    return data.data;
  });
