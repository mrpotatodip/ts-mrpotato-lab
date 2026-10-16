import { z } from "zod";
import { SIGN_UP_EMAIL_MAX, SIGN_UP_PASSWORD_MAX, SIGN_UP_PASSWORD_MIN, SIGN_UP_PERSON_NAME_MAX } from "../constants";

export const TeamInviteIdSchema = z.uuid();
export const TeamPartyIdSchema = z.uuid();

export const TeamInviteParamSchema = z.object({
  inviteId: TeamInviteIdSchema,
});

export const TeamMemberParamSchema = z.object({
  partyId: TeamPartyIdSchema,
});

export const TeamInviteTokenParamSchema = z.object({
  token: z.string().min(1).max(128),
});

export const TeamRoleKeySchema = z.string().trim().min(1).max(64);

export const TeamRoleBodySchema = z.object({
  role: TeamRoleKeySchema,
});

export const TeamRoleSchema = z.object({
  key: z.string(),
  label: z.string(),
  description: z.string().nullable(),
});

export const TeamRolesSchema = z.array(TeamRoleSchema);

export const CreateTeamInviteBodySchema = TeamRoleBodySchema.extend({
  email: z.email().max(SIGN_UP_EMAIL_MAX).trim().toLowerCase(),
});

export const AcceptTeamInviteBodySchema = z.object({
  firstName: z.string().trim().min(1).max(SIGN_UP_PERSON_NAME_MAX).optional(),
  lastName: z.string().trim().min(1).max(SIGN_UP_PERSON_NAME_MAX).optional(),
  password: z.string().min(SIGN_UP_PASSWORD_MIN).max(SIGN_UP_PASSWORD_MAX).optional(),
});

export const TeamMemberSchema = z.object({
  partyId: TeamPartyIdSchema,
  name: z.string(),
  email: z.string(),
  role: z.string(),
  roleLabel: z.string(),
});

export const TeamInviteSchema = z.object({
  id: TeamInviteIdSchema,
  email: z.string(),
  role: z.string(),
  roleLabel: z.string(),
  expiresAt: z.iso.datetime(),
  createdAt: z.iso.datetime(),
});

export const TeamListSchema = z.object({
  members: z.array(TeamMemberSchema),
  invites: z.array(TeamInviteSchema),
});

export const CreatedTeamInviteSchema = z.object({
  token: z.string(),
  invite: TeamInviteSchema,
});

export const TeamDeletedSchema = z.object({ id: z.uuid() });

export const TeamInvitePreviewSchema = z.object({
  cafeName: z.string(),
  email: z.string(),
  role: z.string(),
  roleLabel: z.string(),
  hasAccount: z.boolean(),
});

export const AcceptedTeamInviteSchema = z.object({
  tenantId: z.uuid(),
});

export type TeamInviteParam = z.infer<typeof TeamInviteParamSchema>;
export type TeamMemberParam = z.infer<typeof TeamMemberParamSchema>;
export type TeamInviteTokenParam = z.infer<typeof TeamInviteTokenParamSchema>;
export type TeamRole = z.infer<typeof TeamRoleSchema>;
export type TeamRoles = z.infer<typeof TeamRolesSchema>;
export type TeamRoleBody = z.infer<typeof TeamRoleBodySchema>;
export type CreateTeamInviteBody = z.infer<typeof CreateTeamInviteBodySchema>;
export type AcceptTeamInviteBody = z.infer<typeof AcceptTeamInviteBodySchema>;
export type TeamMember = z.infer<typeof TeamMemberSchema>;
export type TeamInvite = z.infer<typeof TeamInviteSchema>;
export type TeamList = z.infer<typeof TeamListSchema>;
export type CreatedTeamInvite = z.infer<typeof CreatedTeamInviteSchema>;
export type TeamDeleted = z.infer<typeof TeamDeletedSchema>;
export type TeamInvitePreview = z.infer<typeof TeamInvitePreviewSchema>;
export type AcceptedTeamInvite = z.infer<typeof AcceptedTeamInviteSchema>;
