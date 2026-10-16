import { createServerFn } from "@tanstack/react-start";
import { TeamMemberParamSchema } from "@repo/contracts/amelie";
import { apiClient, ApiError } from "#/lib/api-client";
import { tryCatch } from "#/lib/try-catch";
import { withActiveTenant } from "#/lib/active-tenant";
import { TeamDeletedResponseSchema } from "../schemas";

export const removeTeamMember = createServerFn({ method: "POST" })
  .validator(TeamMemberParamSchema)
  .handler(async ({ data: { partyId } }) => {
    const { data, error } = await tryCatch(
      apiClient.delete(await withActiveTenant(`/team/members/${partyId}`), TeamDeletedResponseSchema),
    );

    if (error) {
      throw new Error(error instanceof ApiError ? error.message : "Failed to remove the team member");
    }

    if (!data.data) {
      throw new Error("Failed to remove the team member");
    }

    return data.data;
  });
