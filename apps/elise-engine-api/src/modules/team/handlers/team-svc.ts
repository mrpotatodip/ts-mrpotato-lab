import { Effect } from "effect";
import { hashPassword } from "better-auth/crypto";
import {
  TEAM_INVITE_TTL_MS,
  type AcceptedTeamInvite,
  type AcceptTeamInviteBody,
  type CreatedTeamInvite,
  type CreateTeamInviteBody,
  type TeamInvite,
  type TeamInvitePreview,
  type TeamList,
  type TeamRoles,
} from "@repo/contracts/elise";
import type { DbConnectType, PoolDbType } from "#/lib/db-connection";
import { ExternalError, type DbError, type Forbidden } from "#/lib/effect-query";
import { errorChainForLog } from "#/lib/redact-log";
import { generateInviteToken, hashInviteToken } from "#/modules/team/lib";
import {
  acceptInviteEffect,
  createInviteEffect,
  inviteEmailContextEffect,
  listAssignableRolesEffect,
  listTeamEffect,
  previewInviteEffect,
  revokeInviteEffect,
} from "#/modules/team/queries";
import type { InviteMailer, TeamFailure } from "#/modules/team/types";

export const listTeamSvc = (db: DbConnectType, accountId: string): Effect.Effect<TeamList, DbError> => listTeamEffect(db, accountId, new Date());

export const listTeamRolesSvc = (db: DbConnectType, accountId: string): Effect.Effect<TeamRoles, DbError> => listAssignableRolesEffect(db, accountId);

// -----
// Queue the email for a saved invite. The invite
// and its link already exist, so a failure here
// is logged and never fails the request: the admin
// still has the link to send by hand.
// -----
const queueInviteEmail = (db: PoolDbType, accountId: string, userId: string, mailer: InviteMailer, invite: TeamInvite, token: string) =>
  Effect.gen(function* () {
    const { accountName, inviterName } = yield* inviteEmailContextEffect(db, accountId, userId);
    yield* Effect.tryPromise({
      try: () =>
        mailer.enqueue({
          to: invite.email,
          accountName,
          inviterName,
          roleLabel: invite.roleLabel,
          link: `${mailer.dashboardUrl.replace(/\/$/, "")}/invite/${encodeURIComponent(token)}`,
          expiresAt: invite.expiresAt,
        }),
      catch: (cause) => new ExternalError({ cause }),
    });
  }).pipe(
    Effect.catchTags({
      DbError: (error) => Effect.sync(() => console.error("Invite email not queued", errorChainForLog(error))),
      ExternalError: (error) => Effect.sync(() => console.error("Invite email not queued", errorChainForLog(error))),
    }),
  );

// -----
// The token is made here and returned once. Only
// its hash reaches the database. Once the invite
// is saved, its email is queued.
// -----
export const createInviteSvc = (
  db: PoolDbType,
  accountId: string,
  userId: string,
  body: CreateTeamInviteBody,
  mailer: InviteMailer,
): Effect.Effect<CreatedTeamInvite, TeamFailure> =>
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
    yield* queueInviteEmail(db, accountId, userId, mailer, invite, token);
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
