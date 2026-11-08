import { createServerFn } from "@tanstack/react-start";
import { getCookie } from "@tanstack/react-start/server";
import { engineJson, jsonPost } from "#/lib/engine-client";
import { engineAuth } from "#/modules/auth/server/session";
import {
  AcceptedTeamInviteSchema,
  AcceptInviteInputSchema,
  CreatedTeamInviteSchema,
  CreateGroupInputSchema,
  CreateInviteInputSchema,
  GroupDeletedSchema,
  GroupInputSchema,
  GroupListSchema,
  GroupMemberInputSchema,
  GroupMemberSchema,
  GroupSchema,
  RenameGroupInputSchema,
  InviteTokenInputSchema,
  RevokeInviteInputSchema,
  TeamDeletedSchema,
  TeamInvitePreviewSchema,
  TeamListSchema,
  TeamRolesSchema,
} from "../schemas";

// -----
// /team and /groups need a signed-in tenant_admin; the engine checks it.
// -----
export const fetchTeam = createServerFn({ method: "GET" }).handler(async () => engineJson(TeamListSchema, "/team", {}, await engineAuth()));

export const fetchTeamRoles = createServerFn({ method: "GET" }).handler(async () => engineJson(TeamRolesSchema, "/team/roles", {}, await engineAuth()));

export const createTeamInvite = createServerFn({ method: "POST" })
  .validator(CreateInviteInputSchema)
  .handler(async ({ data }) => engineJson(CreatedTeamInviteSchema, "/team/invites", jsonPost(JSON.stringify(data)), await engineAuth()));

export const revokeTeamInvite = createServerFn({ method: "POST" })
  .validator(RevokeInviteInputSchema)
  .handler(async ({ data }) => engineJson(TeamDeletedSchema, `/team/invites/${data.inviteId}`, { method: "DELETE" }, await engineAuth()));

export const fetchGroups = createServerFn({ method: "GET" }).handler(async () => engineJson(GroupListSchema, "/groups", {}, await engineAuth()));

export const createGroup = createServerFn({ method: "POST" })
  .validator(CreateGroupInputSchema)
  .handler(async ({ data }) => engineJson(GroupSchema, "/groups", jsonPost(JSON.stringify(data)), await engineAuth()));

export const renameGroup = createServerFn({ method: "POST" })
  .validator(RenameGroupInputSchema)
  .handler(async ({ data }) => engineJson(GroupSchema, `/groups/${data.groupId}`, { ...jsonPost(JSON.stringify({ name: data.name })), method: "PATCH" }, await engineAuth()));

export const deleteGroup = createServerFn({ method: "POST" })
  .validator(GroupInputSchema)
  .handler(async ({ data }) => engineJson(GroupDeletedSchema, `/groups/${data.groupId}`, { method: "DELETE" }, await engineAuth()));

export const addGroupMember = createServerFn({ method: "POST" })
  .validator(GroupMemberInputSchema)
  .handler(async ({ data }) => engineJson(GroupMemberSchema, `/groups/${data.groupId}/members/${data.partyId}`, { method: "PUT" }, await engineAuth()));

export const removeGroupMember = createServerFn({ method: "POST" })
  .validator(GroupMemberInputSchema)
  .handler(async ({ data }) => engineJson(GroupMemberSchema, `/groups/${data.groupId}/members/${data.partyId}`, { method: "DELETE" }, await engineAuth()));

// -----
// The invitee's two routes are open: no session needed to read an invite.
// Accepting sends the session token only when there is one, so a person who
// already has a login joins as themselves.
// -----
export const previewTeamInvite = createServerFn({ method: "GET" })
  .validator(InviteTokenInputSchema)
  .handler(async ({ data }) => engineJson(TeamInvitePreviewSchema, `/team/invites/${encodeURIComponent(data.token)}`));

export const acceptTeamInvite = createServerFn({ method: "POST" })
  .validator(AcceptInviteInputSchema)
  .handler(async ({ data: { token, ...body } }) =>
    engineJson(AcceptedTeamInviteSchema, `/team/invites/${encodeURIComponent(token)}/accept`, jsonPost(JSON.stringify(body)), { token: getCookie("elise_session") }),
  );
