import { z } from "zod";
import { GROUP_NAME_MAX } from "../constants";

export const GroupIdSchema = z.uuid();

export const GroupParamSchema = z.object({
  groupId: GroupIdSchema,
});

export const GroupMemberParamSchema = z.object({
  groupId: GroupIdSchema,
  partyId: z.uuid(),
});

export const GroupNameSchema = z.string().trim().min(1).max(GROUP_NAME_MAX);

export const CreateGroupBodySchema = z.object({
  name: GroupNameSchema,
});

export const RenameGroupBodySchema = CreateGroupBodySchema;

export const GroupSchema = z.object({
  id: GroupIdSchema,
  name: z.string(),
  memberIds: z.array(z.uuid()),
  createdAt: z.iso.datetime(),
});

export const GroupListSchema = z.array(GroupSchema);

export const GroupDeletedSchema = z.object({ id: GroupIdSchema });

export const GroupMemberSchema = z.object({ groupId: GroupIdSchema, partyId: z.uuid() });

export type GroupParam = z.infer<typeof GroupParamSchema>;
export type GroupMemberParam = z.infer<typeof GroupMemberParamSchema>;
export type CreateGroupBody = z.infer<typeof CreateGroupBodySchema>;
export type RenameGroupBody = z.infer<typeof RenameGroupBodySchema>;
export type Group = z.infer<typeof GroupSchema>;
export type GroupList = z.infer<typeof GroupListSchema>;
export type GroupDeleted = z.infer<typeof GroupDeletedSchema>;
export type GroupMember = z.infer<typeof GroupMemberSchema>;
