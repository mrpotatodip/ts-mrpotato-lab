import { hashPassword } from "better-auth/crypto";
import { and, eq, isNull } from "drizzle-orm";
import { Effect } from "effect";
import {
  accessAuditLog,
  authAccount,
  authUser,
  parties,
  partyRoles,
  partyRoleScopes,
  persons,
  teamInvites,
} from "@repo/db-amelie";
import {
  TEAM_INVITE_TTL_MS,
  type AcceptTeamInviteBody,
  type AcceptedTeamInvite,
  type CreateTeamInviteBody,
  type CreatedTeamInvite,
  type TeamBinding,
  type TeamDeleted,
  type TeamInvite,
  type TeamInvitePreview,
  type TeamList,
  type TeamRoles,
  type UpdateTeamMemberBody,
  TENANT_ADMIN_ROLE_KEY,
} from "@repo/contracts/amelie";
import type { DbConnectType } from "#/lib/db-connection";
import { Conflict, Forbidden, Invalid, NotFound, toDbError, type DbError } from "#/lib/effect-query";
import { PG_UNIQUE_VIOLATION, pgErrorCode, pgErrorConstraint } from "#/lib/pg-error";
import {
  TEAM_ACCOUNT_REQUIRED,
  TEAM_BINDINGS_ACTION,
  TEAM_EMAIL_ON_TENANT,
  TEAM_INVITE_CONSTRAINT,
  TEAM_LAST_ADMIN,
  TEAM_MEMBER_ABOVE_YOURS,
  TEAM_NEW_ACCOUNT_REQUIRED,
  TEAM_NOT_FOUND,
  TEAM_ROLE_ABOVE_YOURS,
  TEAM_ROLE_CANNOT_BIND,
  TEAM_WRONG_ACCOUNT,
} from "#/modules/team/constants";
import {
  foldBindings,
  generateTeamInviteToken,
  hashTeamInviteToken,
  sameBindings,
} from "#/modules/team/lib";
import {
  countTenantAdminsEffect,
  emailOnTenantEffect,
  findMemberRoleEffect,
  findOpenInviteByTokenHashEffect,
  findPartyIdByUserIdEffect,
  findRoleInTenantEffect,
  findUserByEmailEffect,
  getTeamInviteByIdEffect,
  listAssignableRolesEffect,
  listMemberBindingsEffect,
  listTeamEffect,
  masterRolePowersEffect,
  resolveBindingTargetsEffect,
  toPreview,
} from "#/modules/team/queries";

const classifyInviteInsert = (cause: unknown): Conflict | DbError =>
  pgErrorCode(cause) === PG_UNIQUE_VIOLATION && pgErrorConstraint(cause) === TEAM_INVITE_CONSTRAINT
    ? new Conflict({ message: TEAM_EMAIL_ON_TENANT })
    : toDbError(cause);

const refuseLastAdmin = (current: string, next: string | null, adminCount: number) => {
  if (current !== TENANT_ADMIN_ROLE_KEY) return Effect.void;
  if (next === TENANT_ADMIN_ROLE_KEY) return Effect.void;
  if (adminCount > 1) return Effect.void;
  return Effect.fail(new Conflict({ message: TEAM_LAST_ADMIN }));
};

// -----
// A caller may only hand out, or manage, a Role
// whose Powers they hold in full, so a Role with
// team Powers can never be used to climb above
// itself.
// -----
const refuseAboveCaller = (
  db: DbConnectType,
  masterRoleId: string,
  callerPowers: readonly string[],
  message: string,
): Effect.Effect<void, DbError | Forbidden> =>
  Effect.gen(function* () {
    const powers = yield* masterRolePowersEffect(db, masterRoleId);
    const held = new Set(callerPowers);
    if (!powers.every((power) => held.has(power))) return yield* new Forbidden({ message });
  });

const findAssignableRoleEffect = (
  db: DbConnectType,
  tenantId: string,
  roleKey: string,
  callerPowers: readonly string[],
) =>
  Effect.gen(function* () {
    const role = yield* findRoleInTenantEffect(db, tenantId, roleKey);
    yield* refuseAboveCaller(db, role.masterRoleId, callerPowers, TEAM_ROLE_ABOVE_YOURS);
    return role;
  });

export const listTeamRolesSvc = (
  db: DbConnectType,
  tenantId: string,
  callerPowers: readonly string[],
): Effect.Effect<TeamRoles, DbError> => listAssignableRolesEffect(db, tenantId, callerPowers);

export const listTeamSvc = (db: DbConnectType, tenantId: string): Effect.Effect<TeamList, DbError> =>
  listTeamEffect(db, tenantId);

export const createTeamInviteSvc = (
  db: DbConnectType,
  tenantId: string,
  userId: string,
  callerPowers: readonly string[],
  body: CreateTeamInviteBody,
  now = new Date(),
): Effect.Effect<CreatedTeamInvite, DbError | NotFound | Conflict | Forbidden> =>
  Effect.gen(function* () {
    if (yield* emailOnTenantEffect(db, tenantId, body.email)) {
      return yield* new Conflict({ message: TEAM_EMAIL_ON_TENANT });
    }
    const inviteRole = yield* findAssignableRoleEffect(db, tenantId, body.role, callerPowers);
    const invitedBy = yield* findPartyIdByUserIdEffect(db, userId);
    const token = generateTeamInviteToken();
    const tokenHash = yield* Effect.promise(() => hashTeamInviteToken(token));
    const expiresAt = new Date(now.getTime() + TEAM_INVITE_TTL_MS);
    const id = yield* Effect.tryPromise({
      try: () =>
        db.transaction(async (tx) => {
          await tx
            .update(teamInvites)
            .set({ revokedAt: now, updatedAt: now })
            .where(
              and(
                eq(teamInvites.tenantId, tenantId),
                eq(teamInvites.email, body.email),
                isNull(teamInvites.revokedAt),
                isNull(teamInvites.acceptedAt),
              ),
            );
          const [row] = await tx
            .insert(teamInvites)
            .values({
              tenantId,
              email: body.email,
              roleId: inviteRole.id,
              tokenHash,
              invitedBy,
              expiresAt,
            })
            .returning({ id: teamInvites.id });
          return row.id;
        }),
      catch: classifyInviteInsert,
    });
    const invite = yield* getTeamInviteByIdEffect(db, tenantId, id);
    return { token, invite };
  });

export const updateTeamInviteSvc = (
  db: DbConnectType,
  tenantId: string,
  inviteId: string,
  role: string,
  callerPowers: readonly string[],
): Effect.Effect<TeamInvite, DbError | NotFound | Forbidden> =>
  Effect.gen(function* () {
    const nextRole = yield* findAssignableRoleEffect(db, tenantId, role, callerPowers);
    yield* getTeamInviteByIdEffect(db, tenantId, inviteId);
    yield* Effect.tryPromise({
      try: () =>
        db
          .update(teamInvites)
          .set({ roleId: nextRole.id, updatedAt: new Date() })
          .where(and(eq(teamInvites.id, inviteId), eq(teamInvites.tenantId, tenantId))),
      catch: toDbError,
    });
    return yield* getTeamInviteByIdEffect(db, tenantId, inviteId);
  });

export const revokeTeamInviteSvc = (
  db: DbConnectType,
  tenantId: string,
  inviteId: string,
): Effect.Effect<TeamDeleted, DbError | NotFound> =>
  Effect.gen(function* () {
    yield* getTeamInviteByIdEffect(db, tenantId, inviteId);
    yield* Effect.tryPromise({
      try: () =>
        db
          .update(teamInvites)
          .set({ revokedAt: new Date(), updatedAt: new Date() })
          .where(and(eq(teamInvites.id, inviteId), eq(teamInvites.tenantId, tenantId))),
      catch: toDbError,
    });
    return { id: inviteId };
  });

type Tx = Parameters<Parameters<DbConnectType["transaction"]>[0]>[0];

// -----
// Every change to a member's Bindings is written to
// the append-only audit log with who did it and the
// set before and after. subject_id is the Person; the
// Tenant is in the payload because a Person can sit in
// several.
// -----
const recordBindings = (
  tx: Tx,
  actorPartyId: string,
  tenantId: string,
  partyId: string,
  before: TeamBinding[],
  after: TeamBinding[],
) =>
  tx.insert(accessAuditLog).values({
    actorPartyId,
    action: TEAM_BINDINGS_ACTION,
    subjectId: partyId,
    before: { tenantId, bindings: before },
    after: { tenantId, bindings: after },
  });

export const updateTeamMemberSvc = (
  db: DbConnectType,
  tenantId: string,
  partyId: string,
  userId: string,
  body: UpdateTeamMemberBody,
  callerPowers: readonly string[],
): Effect.Effect<TeamList, DbError | NotFound | Conflict | Forbidden | Invalid> =>
  Effect.gen(function* () {
    const { role, bindings } = body;
    const current = yield* findMemberRoleEffect(db, tenantId, partyId);
    yield* refuseAboveCaller(db, current.masterRoleId, callerPowers, TEAM_MEMBER_ABOVE_YOURS);
    const adminCount = yield* countTenantAdminsEffect(db, tenantId);
    yield* refuseLastAdmin(current.roleKey, role, adminCount);
    const nextRole = yield* findAssignableRoleEffect(db, tenantId, role, callerPowers);
    if (!nextRole.canBeBound && bindings && bindings.length > 0) {
      return yield* new Invalid({ message: TEAM_ROLE_CANNOT_BIND });
    }
    const requested = nextRole.canBeBound ? bindings : [];
    const folded = requested
      ? foldBindings(requested, yield* resolveBindingTargetsEffect(db, tenantId, requested))
      : null;
    const before = yield* listMemberBindingsEffect(db, tenantId, current.partyRoleId);
    const actor = yield* findPartyIdByUserIdEffect(db, userId);
    yield* Effect.tryPromise({
      try: () =>
        db.transaction(async (tx) => {
          await tx
            .update(partyRoles)
            .set({ roleId: nextRole.id, roleScope: nextRole.scope, updatedAt: new Date() })
            .where(and(eq(partyRoles.tenantId, tenantId), eq(partyRoles.partyId, partyId)));
          if (!folded || sameBindings(before, folded)) return;
          await tx.delete(partyRoleScopes).where(eq(partyRoleScopes.partyRoleId, current.partyRoleId));
          if (folded.length > 0) {
            await tx.insert(partyRoleScopes).values(
              folded.map((binding) => ({
                tenantId,
                partyRoleId: current.partyRoleId,
                countryId: binding.kind === "country" ? binding.id : null,
                locationId: binding.kind === "location" ? binding.id : null,
              })),
            );
          }
          await recordBindings(tx, actor, tenantId, partyId, before, folded);
        }),
      catch: toDbError,
    });
    return yield* listTeamEffect(db, tenantId);
  });

export const removeTeamMemberSvc = (
  db: DbConnectType,
  tenantId: string,
  partyId: string,
  userId: string,
  callerPowers: readonly string[],
): Effect.Effect<TeamDeleted, DbError | NotFound | Conflict | Forbidden> =>
  Effect.gen(function* () {
    const current = yield* findMemberRoleEffect(db, tenantId, partyId);
    yield* refuseAboveCaller(db, current.masterRoleId, callerPowers, TEAM_MEMBER_ABOVE_YOURS);
    const adminCount = yield* countTenantAdminsEffect(db, tenantId);
    yield* refuseLastAdmin(current.roleKey, null, adminCount);
    const before = yield* listMemberBindingsEffect(db, tenantId, current.partyRoleId);
    const actor = yield* findPartyIdByUserIdEffect(db, userId);
    yield* Effect.tryPromise({
      try: () =>
        db.transaction(async (tx) => {
          await tx.delete(partyRoles).where(and(eq(partyRoles.tenantId, tenantId), eq(partyRoles.partyId, partyId)));
          if (before.length > 0) await recordBindings(tx, actor, tenantId, partyId, before, []);
        }),
      catch: toDbError,
    });
    return { id: partyId };
  });

export const getTeamInvitePreviewSvc = (
  db: DbConnectType,
  token: string,
  now = new Date(),
): Effect.Effect<TeamInvitePreview, DbError | NotFound> =>
  Effect.gen(function* () {
    const tokenHash = yield* Effect.promise(() => hashTeamInviteToken(token));
    const rows = yield* findOpenInviteByTokenHashEffect(db, tokenHash, now);
    const [row] = rows;
    if (!row) return yield* new NotFound({ message: TEAM_NOT_FOUND });
    const account = yield* findUserByEmailEffect(db, row.email);
    return toPreview(row, account !== null);
  });

export const acceptTeamInviteSvc = (
  db: DbConnectType,
  token: string,
  sessionUserId: string | null,
  body: AcceptTeamInviteBody,
  now = new Date(),
): Effect.Effect<AcceptedTeamInvite, DbError | NotFound | Conflict | Forbidden | Invalid> =>
  Effect.gen(function* () {
    const tokenHash = yield* Effect.promise(() => hashTeamInviteToken(token));
    const rows = yield* findOpenInviteByTokenHashEffect(db, tokenHash, now);
    const [invite] = rows;
    if (!invite) return yield* new NotFound({ message: TEAM_NOT_FOUND });
    if (yield* emailOnTenantEffect(db, invite.tenantId, invite.email)) {
      yield* Effect.tryPromise({
        try: () =>
          db
            .update(teamInvites)
            .set({ acceptedAt: now, updatedAt: now })
            .where(eq(teamInvites.id, invite.id)),
        catch: toDbError,
      });
      return { tenantId: invite.tenantId };
    }
    const existing = yield* findUserByEmailEffect(db, invite.email);
    const role = yield* findRoleInTenantEffect(db, invite.tenantId, invite.roleKey);
    if (existing) {
      if (!sessionUserId) return yield* new Forbidden({ message: TEAM_ACCOUNT_REQUIRED });
      const sessionPartyId = yield* findPartyIdByUserIdEffect(db, sessionUserId);
      if (sessionPartyId !== existing.partyId) return yield* new Forbidden({ message: TEAM_WRONG_ACCOUNT });
      yield* Effect.tryPromise({
        try: () =>
          db.transaction(async (tx) => {
            await tx.insert(partyRoles).values({
              partyId: existing.partyId,
              tenantId: invite.tenantId,
              roleId: role.id,
              roleScope: role.scope,
            });
            await tx
              .update(teamInvites)
              .set({ acceptedAt: now, updatedAt: now })
              .where(eq(teamInvites.id, invite.id));
          }),
        catch: toDbError,
      });
      return { tenantId: invite.tenantId };
    }
    const firstName = body.firstName;
    const lastName = body.lastName;
    const password = body.password;
    if (!firstName || !lastName || !password) {
      return yield* new Invalid({ message: TEAM_NEW_ACCOUNT_REQUIRED });
    }
    const passwordHash = yield* Effect.promise(() => hashPassword(password));
    yield* Effect.tryPromise({
      try: () =>
        db.transaction(async (tx) => {
          const [personParty] = await tx.insert(parties).values({ type: "person" }).returning();
          await tx.insert(persons).values({
            partyId: personParty.id,
            firstName,
            lastName,
          });
          const userId = crypto.randomUUID();
          await tx.insert(authUser).values({
            id: userId,
            name: `${firstName} ${lastName}`,
            email: invite.email,
            emailVerified: false,
            partyId: personParty.id,
          });
          await tx.insert(authAccount).values({
            id: crypto.randomUUID(),
            accountId: userId,
            providerId: "credential",
            userId,
            password: passwordHash,
          });
          await tx.insert(partyRoles).values({
            partyId: personParty.id,
            tenantId: invite.tenantId,
            roleId: role.id,
            roleScope: role.scope,
          });
          await tx
            .update(teamInvites)
            .set({ acceptedAt: now, updatedAt: now })
            .where(eq(teamInvites.id, invite.id));
        }),
      catch: toDbError,
    });
    return { tenantId: invite.tenantId };
  });
