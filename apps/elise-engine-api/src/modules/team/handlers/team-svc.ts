import { Effect } from "effect";
import { hashPassword } from "better-auth/crypto";
import {
  TEAM_INVITE_TTL_MS,
  type AcceptedTeamInvite,
  type AcceptTeamInviteBody,
  type CreatedTeamInvite,
  type CreateTeamInviteBody,
  type TeamInvitePreview,
  type TeamList,
  type TeamRoles,
} from "@repo/contracts/elise";
import type { DbConnectType, PoolDbType } from "#/lib/db-connection";
import type { DbError, Forbidden } from "#/lib/effect-query";
import { generateInviteToken, hashInviteToken } from "#/modules/team/lib";
import {
  acceptInviteEffect,
  createInviteEffect,
  listAssignableRolesEffect,
  listTeamEffect,
  previewInviteEffect,
  revokeInviteEffect,
} from "#/modules/team/queries";
import type { TeamFailure } from "#/modules/team/types";

export const listTeamSvc = (db: DbConnectType, accountId: string): Effect.Effect<TeamList, DbError> => listTeamEffect(db, accountId, new Date());

export const listTeamRolesSvc = (db: DbConnectType, accountId: string): Effect.Effect<TeamRoles, DbError> => listAssignableRolesEffect(db, accountId);

// -----
// The token is made here and returned once. Only
// its hash reaches the database.
// -----
export const createInviteSvc = (db: PoolDbType, accountId: string, userId: string, body: CreateTeamInviteBody): Effect.Effect<CreatedTeamInvite, TeamFailure> =>
  Effect.gen(function* () {
    const token = generateInviteToken();
    const tokenHash = yield* Effect.promise(() => hashInviteToken(token));
    const now = new Date();
    const invite = yield* createInviteEffect(db, {
      tenantId: accountId,
      actorUserId: userId,
      email: body.email,
      roleKey: body.role,
      groupIds: body.groupIds ?? [],
      tokenHash,
      now,
      expiresAt: new Date(now.getTime() + TEAM_INVITE_TTL_MS),
    });
    return { token, invite };
  });

export const revokeInviteSvc = (db: PoolDbType, accountId: string, userId: string, inviteId: string): Effect.Effect<{ id: string }, TeamFailure> =>
  revokeInviteEffect(db, accountId, inviteId, userId, new Date());

export const previewInviteSvc = (db: DbConnectType, token: string): Effect.Effect<TeamInvitePreview, Forbidden | DbError> =>
  Effect.gen(function* () {
    const tokenHash = yield* Effect.promise(() => hashInviteToken(token));
    return yield* previewInviteEffect(db, tokenHash, new Date());
  });

// -----
// A new login needs all three of name, last name
// and password; an existing one sends none and
// signs in instead.
// -----
export const acceptInviteSvc = (
  db: PoolDbType,
  token: string,
  body: AcceptTeamInviteBody,
  signedInUserId: string | undefined,
): Effect.Effect<AcceptedTeamInvite, TeamFailure> =>
  Effect.gen(function* () {
    const tokenHash = yield* Effect.promise(() => hashInviteToken(token));
    const { firstName, lastName, password } = body;
    const newLogin =
      firstName && lastName && password ? { firstName, lastName, passwordHash: yield* Effect.promise(() => hashPassword(password)) } : undefined;
    return yield* acceptInviteEffect(db, { tokenHash, now: new Date(), signedInUserId, newLogin });
  });
