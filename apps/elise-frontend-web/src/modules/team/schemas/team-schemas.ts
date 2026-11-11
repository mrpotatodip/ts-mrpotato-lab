import { z } from "zod";
import {
  AcceptTeamInviteBodySchema,
  CreateGroupBodySchema,
  CreateTeamInviteBodySchema,
  GROUP_NAME_MAX,
  GroupMemberParamSchema,
  GroupParamSchema,
  SIGN_UP_PASSWORD_MAX,
  SIGN_UP_PASSWORD_MIN,
  SIGN_UP_PERSON_NAME_MAX,
  TeamInviteParamSchema,
  TeamInviteTokenParamSchema,
} from "@repo/contracts/elise";

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

// -----
// The two fields of the invite dialog, with the messages it shows. The
// engine's body (`CreateInviteInputSchema`) stays the one that is sent.
// -----
export const InviteDetailsSchema = z.object({
  email: z.email("That doesn't look like an email address. Use the form name@company.com."),
  role: z.string().min(1, "Pick what they should be able to do."),
});

// -----
// The name field of the create and rename forms.
// -----
export const GroupNameDetailsSchema = z.object({
  name: z.string().trim().min(1, "Give the group a name.").max(GROUP_NAME_MAX, `Use ${GROUP_NAME_MAX} characters or fewer.`),
});

export const AcceptInviteInputSchema = TeamInviteTokenParamSchema.and(AcceptTeamInviteBodySchema);

// -----
// What a new person types on the accept page. The same limits as the
// engine's body, with the messages the form shows under each field.
// -----
export const AcceptInviteDetailsSchema = z.object({
  firstName: z.string().trim().min(1, "Tell us your first name.").max(SIGN_UP_PERSON_NAME_MAX),
  lastName: z.string().trim().min(1, "Tell us your last name.").max(SIGN_UP_PERSON_NAME_MAX),
  password: z.string().min(SIGN_UP_PASSWORD_MIN, `Use at least ${SIGN_UP_PASSWORD_MIN} characters so it is hard to guess.`).max(SIGN_UP_PASSWORD_MAX),
});

export type CreateInviteInput = z.infer<typeof CreateInviteInputSchema>;
export type AcceptInviteInput = z.infer<typeof AcceptInviteInputSchema>;
