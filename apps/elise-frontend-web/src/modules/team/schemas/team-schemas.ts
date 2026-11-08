import { z } from "zod";
import { CreateGroupBodySchema, CreateTeamInviteBodySchema, GroupMemberParamSchema, GroupParamSchema, TeamInviteParamSchema, TeamInviteTokenParamSchema } from "@repo/contracts/elise";

export {
  AcceptedTeamInviteSchema,
  CreatedTeamInviteSchema,
  CreateGroupBodySchema,
  CreateTeamInviteBodySchema,
  GroupDeletedSchema,
  GroupListSchema,
  GroupMemberSchema,
  GroupSchema,
  TeamDeletedSchema,
  TeamInvitePreviewSchema,
  TeamListSchema,
  TeamRolesSchema,
} from "@repo/contracts/elise";
export type { CreatedTeamInvite, Group, TeamInvite, TeamInvitePreview, TeamList, TeamMember, TeamRole } from "@repo/contracts/elise";

export const InviteTokenInputSchema = TeamInviteTokenParamSchema;
export const CreateInviteInputSchema = CreateTeamInviteBodySchema;
export const RevokeInviteInputSchema = TeamInviteParamSchema;
export const CreateGroupInputSchema = CreateGroupBodySchema;
export const GroupInputSchema = GroupParamSchema;
export const RenameGroupInputSchema = GroupParamSchema.and(CreateGroupBodySchema);
export const GroupMemberInputSchema = GroupMemberParamSchema;

export const AcceptInviteInputSchema = z.object({
  token: z.string().min(1).max(128),
  firstName: z.string().trim().min(1).optional(),
  lastName: z.string().trim().min(1).optional(),
  password: z.string().min(1).optional(),
});

export type CreateInviteInput = z.infer<typeof CreateInviteInputSchema>;
export type AcceptInviteInput = z.infer<typeof AcceptInviteInputSchema>;
