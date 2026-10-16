import {
  AcceptedTeamInviteSchema,
  CreatedTeamInviteSchema,
  TeamDeletedSchema,
  TeamInvitePreviewSchema,
  TeamInviteSchema,
  TeamListSchema,
  TeamRolesSchema,
} from "@repo/contracts/amelie";
import { apiResponseSchema } from "#/lib/api-response-schema";

export const TeamListResponseSchema = apiResponseSchema(TeamListSchema);
export const TeamRolesResponseSchema = apiResponseSchema(TeamRolesSchema);
export const TeamInviteResponseSchema = apiResponseSchema(TeamInviteSchema);
export const CreatedTeamInviteResponseSchema = apiResponseSchema(CreatedTeamInviteSchema);
export const TeamDeletedResponseSchema = apiResponseSchema(TeamDeletedSchema);
export const TeamInvitePreviewResponseSchema = apiResponseSchema(TeamInvitePreviewSchema);
export const AcceptedTeamInviteResponseSchema = apiResponseSchema(AcceptedTeamInviteSchema);
