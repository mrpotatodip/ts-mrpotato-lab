import { and, asc, eq, gt, inArray, isNull, ne, sql } from "drizzle-orm";
import { Data, Effect } from "effect";
import {
  accessMasterRoles,
  authUser,
  findTenantRole,
  partyMasterRoles,
  partyRoles,
  platformMasterPlans,
  tenantGroupMembers,
  tenantGroups,
  tenantSubscriptions,
  tenantTeamInviteGroups,
  tenantTeamInvites,
  tenants,
} from "@repo/db-elise";
import {
  TEAM_PENDING_INVITE_LIMIT,
  TENANT_ADMIN_ROLE_KEY,
  type AcceptedTeamInvite,
  type TeamInvite,
  type TeamInvitePreview,
  type TeamList,
  type TeamRoles,
} from "@repo/contracts/elise";
import type { DbConnectType, PoolDbType } from "#/lib/db-connection";
import { Conflict, DbError, Forbidden, Invalid, NotFound, toDbError } from "#/lib/effect-query";
import { PG_UNIQUE_VIOLATION, pgErrorCode, pgErrorConstraint } from "#/lib/pg-error";
import { actorPartyOf, insertAuditEntry } from "#/modules/audit-trail";
import { createPersonLogin } from "#/modules/person-logins";
import {
  TEAM_ALREADY_MEMBER,
  TEAM_EMAIL_TAKEN,
  TEAM_GROUP_UNKNOWN,
  TEAM_INVITE_DETAILS_REQUIRED,
  TEAM_INVITE_INVALID,
  TEAM_INVITE_NOT_FOUND,
  TEAM_INVITE_RACE,
  TEAM_INVITE_SIGN_IN_REQUIRED,
  TEAM_PENDING_EMAIL_CONSTRAINT,
  TEAM_ROLE_UNKNOWN,
  TEAM_TOO_MANY_INVITES,
  teamPlanFullMessage,
} from "#/modules/team/constants";
import type { AcceptInvite, NewInvite } from "#/modules/team/types";

// -----
// A pending invite: not revoked, not accepted,
// not past its expiry.
// -----
const pendingAt = (now: Date) =>
  and(isNull(tenantTeamInvites.revokedAt), isNull(tenantTeamInvites.acceptedAt), gt(tenantTeamInvites.expiresAt, now));

const groupIdsBy = <K extends string>(rows: { key: K; groupId: string }[]): Map<K, string[]> => {
  const byKey = new Map<K, string[]>();
  for (const row of rows) byKey.set(row.key, [...(byKey.get(row.key) ?? []), row.groupId]);
  return byKey;
};

// -----
// The Roles an invite may give: the Tenant's
// enabled Roles, except tenant_admin.
// -----
export const listAssignableRolesEffect = (db: DbConnectType, tenantId: string): Effect.Effect<TeamRoles, DbError> =>
  Effect.tryPromise({
    try: () =>
      db
        .select({ key: accessMasterRoles.key, label: accessMasterRoles.label, description: accessMasterRoles.description })
        .from(partyMasterRoles)
        .innerJoin(accessMasterRoles, eq(accessMasterRoles.id, partyMasterRoles.masterRoleId))
        .where(
          and(
            eq(partyMasterRoles.tenantId, tenantId),
            eq(accessMasterRoles.enabled, true),
            eq(accessMasterRoles.scope, "tenant"),
            ne(accessMasterRoles.key, TENANT_ADMIN_ROLE_KEY),
          ),
        )
        .orderBy(asc(accessMasterRoles.label)),
    catch: toDbError,
  });

// -----
// Everyone who holds a Role in the Tenant, and
// the invites still waiting, each with its Groups.
// -----
export const listTeamEffect = (db: DbConnectType, tenantId: string, now: Date): Effect.Effect<TeamList, DbError> =>
  Effect.gen(function* () {
    const members = yield* Effect.tryPromise({
      try: () =>
        db
          .select({
            partyId: partyRoles.partyId,
            name: authUser.name,
            email: authUser.email,
            role: accessMasterRoles.key,
            roleLabel: accessMasterRoles.label,
          })
          .from(partyRoles)
          .innerJoin(authUser, eq(authUser.partyId, partyRoles.partyId))
          .innerJoin(partyMasterRoles, eq(partyMasterRoles.id, partyRoles.roleId))
          .innerJoin(accessMasterRoles, eq(accessMasterRoles.id, partyMasterRoles.masterRoleId))
          .where(eq(partyRoles.tenantId, tenantId))
          .orderBy(asc(authUser.name)),
      catch: toDbError,
    });
    const memberGroups = yield* Effect.tryPromise({
      try: () =>
        db
          .select({ key: tenantGroupMembers.partyId, groupId: tenantGroupMembers.groupId })
          .from(tenantGroupMembers)
          .where(eq(tenantGroupMembers.tenantId, tenantId)),
      catch: toDbError,
    });
    const invites = yield* Effect.tryPromise({
      try: () =>
        db
          .select({
            id: tenantTeamInvites.id,
            email: tenantTeamInvites.email,
            role: accessMasterRoles.key,
            roleLabel: accessMasterRoles.label,
            expiresAt: tenantTeamInvites.expiresAt,
            createdAt: tenantTeamInvites.createdAt,
          })
          .from(tenantTeamInvites)
          .innerJoin(partyMasterRoles, eq(partyMasterRoles.id, tenantTeamInvites.roleId))
          .innerJoin(accessMasterRoles, eq(accessMasterRoles.id, partyMasterRoles.masterRoleId))
          .where(and(eq(tenantTeamInvites.tenantId, tenantId), pendingAt(now)))
          .orderBy(asc(tenantTeamInvites.createdAt)),
      catch: toDbError,
    });
    const inviteGroups = yield* Effect.tryPromise({
      try: () =>
        db
          .select({ key: tenantTeamInviteGroups.inviteId, groupId: tenantTeamInviteGroups.groupId })
          .from(tenantTeamInviteGroups)
          .where(eq(tenantTeamInviteGroups.tenantId, tenantId)),
      catch: toDbError,
    });

    const groupsOfMember = groupIdsBy(memberGroups);
    const groupsOfInvite = groupIdsBy(inviteGroups);
    return {
      members: members.map((member) => ({ ...member, groupIds: groupsOfMember.get(member.partyId) ?? [] })),
      invites: invites.map((invite) => ({
        ...invite,
        groupIds: groupsOfInvite.get(invite.id) ?? [],
        expiresAt: invite.expiresAt.toISOString(),
        createdAt: invite.createdAt.toISOString(),
      })),
    };
  });

// -----
// Thrown inside a transaction to roll it back;
// each maps to one domain failure.
// -----
class Refused extends Data.TaggedError("Refused")<{ failure: Conflict | Forbidden | Invalid | NotFound }> {}

const classify = (cause: unknown): Conflict | Forbidden | Invalid | NotFound | DbError => {
  if (cause instanceof Refused) return cause.failure;
  if (pgErrorCode(cause) !== PG_UNIQUE_VIOLATION) return toDbError(cause);
  return pgErrorConstraint(cause) === TEAM_PENDING_EMAIL_CONSTRAINT
    ? new Conflict({ message: TEAM_INVITE_RACE })
    : new Conflict({ message: TEAM_EMAIL_TAKEN });
};

const refuse = (failure: Conflict | Forbidden | Invalid | NotFound): never => {
  throw new Refused({ failure });
};

// -----
// Make an invite. In one transaction: check the
// Role and Groups, refuse a person already in the
// account, replace any pending invite for the same
// email (so only the newest link works), save the
// invite and its Groups, and write the audit row.
// -----
export const createInviteEffect = (db: PoolDbType, invite: NewInvite): Effect.Effect<TeamInvite, Conflict | Invalid | DbError | Forbidden | NotFound> =>
  Effect.tryPromise({
    try: () =>
      db.transaction(async (tx) => {
        const actorPartyId = await actorPartyOf(tx, invite.actorUserId);
        if (!actorPartyId) return refuse(new Forbidden({ message: "Forbidden" }));

        const role = await findTenantRole(tx, invite.tenantId, invite.roleKey);
        if (!role?.enabled || role.key === TENANT_ADMIN_ROLE_KEY) return refuse(new Invalid({ message: TEAM_ROLE_UNKNOWN }));

        const groupIds = [...new Set(invite.groupIds)];
        if (groupIds.length > 0) {
          const found = await tx
            .select({ id: tenantGroups.id })
            .from(tenantGroups)
            .where(and(eq(tenantGroups.tenantId, invite.tenantId), inArray(tenantGroups.id, groupIds)));
          if (found.length !== groupIds.length) return refuse(new Invalid({ message: TEAM_GROUP_UNKNOWN }));
        }

        const [member] = await tx
          .select({ id: partyRoles.id })
          .from(partyRoles)
          .innerJoin(authUser, eq(authUser.partyId, partyRoles.partyId))
          .where(and(eq(partyRoles.tenantId, invite.tenantId), eq(sql`lower(${authUser.email})`, invite.email)))
          .limit(1);
        if (member) return refuse(new Conflict({ message: TEAM_ALREADY_MEMBER }));

        const replaced = await tx
          .update(tenantTeamInvites)
          .set({ revokedAt: invite.now })
          .where(and(eq(tenantTeamInvites.tenantId, invite.tenantId), eq(tenantTeamInvites.email, invite.email), pendingAt(invite.now)))
          .returning({ id: tenantTeamInvites.id });
        await Promise.all(
          replaced.map((old) =>
            insertAuditEntry(tx, { actorPartyId, action: "team.invite.revoked", subjectId: old.id, tenantId: invite.tenantId, after: { reason: "replaced" } }),
          ),
        );

        const [{ pending }] = await tx
          .select({ pending: sql<number>`count(*)::int` })
          .from(tenantTeamInvites)
          .where(and(eq(tenantTeamInvites.tenantId, invite.tenantId), pendingAt(invite.now)));
        if (pending >= TEAM_PENDING_INVITE_LIMIT) return refuse(new Conflict({ message: TEAM_TOO_MANY_INVITES }));

        // -----
        // The plan holds a number of people. People in the account plus
        // invites still waiting count; an account with no plan has no cap.
        // -----
        const [plan] = await tx
          .select({ maxMembers: platformMasterPlans.maxMembers })
          .from(tenantSubscriptions)
          .innerJoin(platformMasterPlans, eq(platformMasterPlans.id, tenantSubscriptions.planId))
          .where(eq(tenantSubscriptions.tenantId, invite.tenantId));
        if (plan) {
          const [{ members }] = await tx
            .select({ members: sql<number>`count(distinct ${partyRoles.partyId})::int` })
            .from(partyRoles)
            .where(eq(partyRoles.tenantId, invite.tenantId));
          if (members + pending >= plan.maxMembers) return refuse(new Conflict({ message: teamPlanFullMessage(plan.maxMembers) }));
        }

        const [row] = await tx
          .insert(tenantTeamInvites)
          .values({
            tenantId: invite.tenantId,
            email: invite.email,
            roleId: role.id,
            tokenHash: invite.tokenHash,
            invitedBy: actorPartyId,
            expiresAt: invite.expiresAt,
          })
          .returning();
        if (groupIds.length > 0) {
          await tx.insert(tenantTeamInviteGroups).values(groupIds.map((groupId) => ({ inviteId: row.id, groupId, tenantId: invite.tenantId })));
        }
        await insertAuditEntry(tx, {
          actorPartyId,
          action: "team.invite.created",
          subjectId: row.id,
          tenantId: invite.tenantId,
          after: { email: invite.email, role: role.key, groupIds },
        });

        return {
          id: row.id,
          email: row.email,
          role: role.key,
          roleLabel: role.label,
          groupIds,
          expiresAt: row.expiresAt.toISOString(),
          createdAt: row.createdAt.toISOString(),
        };
      }),
    catch: classify,
  });

// -----
// The two names an invite email shows: the
// account, and the admin who made the invite.
// -----
export const inviteEmailContextEffect = (
  db: PoolDbType,
  tenantId: string,
  actorUserId: string,
): Effect.Effect<{ accountName: string; inviterName: string }, DbError> =>
  Effect.gen(function* () {
    const [tenant] = yield* Effect.tryPromise({
      try: () => db.select({ name: tenants.name }).from(tenants).where(eq(tenants.id, tenantId)),
      catch: toDbError,
    });
    const [actor] = yield* Effect.tryPromise({
      try: () => db.select({ name: authUser.name }).from(authUser).where(eq(authUser.id, actorUserId)),
      catch: toDbError,
    });
    return { accountName: tenant?.name ?? "your team", inviterName: actor?.name ?? "A teammate" };
  });

// -----
// Revoke a pending invite of this Tenant. An
// accepted, revoked or unknown one is NotFound.
// -----
export const revokeInviteEffect = (
  db: PoolDbType,
  tenantId: string,
  inviteId: string,
  actorUserId: string,
  now: Date,
): Effect.Effect<{ id: string }, NotFound | Forbidden | DbError> =>
  Effect.tryPromise({
    try: () =>
      db.transaction(async (tx) => {
        const actorPartyId = await actorPartyOf(tx, actorUserId);
        if (!actorPartyId) return refuse(new Forbidden({ message: "Forbidden" }));
        const [row] = await tx
          .update(tenantTeamInvites)
          .set({ revokedAt: now })
          .where(and(eq(tenantTeamInvites.id, inviteId), eq(tenantTeamInvites.tenantId, tenantId), pendingAt(now)))
          .returning({ id: tenantTeamInvites.id });
        if (!row) return refuse(new NotFound({ message: TEAM_INVITE_NOT_FOUND }));
        await insertAuditEntry(tx, { actorPartyId, action: "team.invite.revoked", subjectId: row.id, tenantId, after: { reason: "revoked" } });
        return row;
      }),
    catch: (cause) => {
      const failure = classify(cause);
      return failure._tag === "Conflict" || failure._tag === "Invalid" ? toDbError(cause) : failure;
    },
  });

// -----
// What the accept page shows before anyone is
// signed in: the account, the Role, and whether
// the invited address already has a login. Never
// the address itself.
// -----
export const previewInviteEffect = (db: DbConnectType, tokenHash: string, now: Date): Effect.Effect<TeamInvitePreview, Forbidden | DbError> =>
  Effect.gen(function* () {
    const [invite] = yield* Effect.tryPromise({
      try: () =>
        db
          .select({
            id: tenantTeamInvites.id,
            email: tenantTeamInvites.email,
            accountName: tenants.name,
            role: accessMasterRoles.key,
            roleLabel: accessMasterRoles.label,
          })
          .from(tenantTeamInvites)
          .innerJoin(tenants, eq(tenants.id, tenantTeamInvites.tenantId))
          .innerJoin(partyMasterRoles, eq(partyMasterRoles.id, tenantTeamInvites.roleId))
          .innerJoin(accessMasterRoles, eq(accessMasterRoles.id, partyMasterRoles.masterRoleId))
          .where(and(eq(tenantTeamInvites.tokenHash, tokenHash), pendingAt(now))),
      catch: toDbError,
    });
    if (!invite) return yield* new Forbidden({ message: TEAM_INVITE_INVALID });
    const login = yield* Effect.tryPromise({
      try: () => db.select({ id: authUser.id }).from(authUser).where(eq(sql`lower(${authUser.email})`, invite.email)).limit(1),
      catch: toDbError,
    });
    return {
      accountName: invite.accountName,
      role: invite.role,
      roleLabel: invite.roleLabel,
      hasAccount: login.length > 0,
    };
  });

// -----
// Accept an invite. The first statement marks it
// accepted only if it is still pending, so two
// requests for one link cannot both win. Every
// later step is in the same transaction: a failure
// gives the invite back.
//   - The email has a login: the caller must be
//     signed in as it.
//   - It has none: the caller gives a name and a
//     password, and a login is made.
// The Role is checked again, in case it was
// disabled since the invite was made.
// -----
export const acceptInviteEffect = (
  db: PoolDbType,
  accept: AcceptInvite,
): Effect.Effect<AcceptedTeamInvite, Conflict | Forbidden | Invalid | NotFound | DbError> =>
  Effect.tryPromise({
    try: () =>
      db.transaction(async (tx) => {
        const [invite] = await tx
          .update(tenantTeamInvites)
          .set({ acceptedAt: accept.now })
          .where(and(eq(tenantTeamInvites.tokenHash, accept.tokenHash), pendingAt(accept.now)))
          .returning();
        if (!invite) return refuse(new Forbidden({ message: TEAM_INVITE_INVALID }));

        const [role] = await tx
          .select({ key: accessMasterRoles.key })
          .from(partyMasterRoles)
          .innerJoin(accessMasterRoles, eq(accessMasterRoles.id, partyMasterRoles.masterRoleId))
          .where(
            and(
              eq(partyMasterRoles.id, invite.roleId),
              eq(partyMasterRoles.tenantId, invite.tenantId),
              eq(accessMasterRoles.enabled, true),
              ne(accessMasterRoles.key, TENANT_ADMIN_ROLE_KEY),
            ),
          );
        if (!role) return refuse(new Forbidden({ message: TEAM_INVITE_INVALID }));

        const [existing] = await tx
          .select({ id: authUser.id, partyId: authUser.partyId })
          .from(authUser)
          .where(eq(sql`lower(${authUser.email})`, invite.email));

        let partyId: string;
        if (existing) {
          if (accept.signedInUserId !== existing.id) return refuse(new Forbidden({ message: TEAM_INVITE_SIGN_IN_REQUIRED }));
          partyId = existing.partyId;
        } else {
          if (!accept.newLogin) return refuse(new Invalid({ message: TEAM_INVITE_DETAILS_REQUIRED }));
          const { firstName, lastName, passwordHash } = accept.newLogin;
          partyId = (await createPersonLogin(tx, { firstName, lastName, email: invite.email, passwordHash })).partyId;
        }

        const [held] = await tx
          .select({ id: partyRoles.id })
          .from(partyRoles)
          .where(and(eq(partyRoles.tenantId, invite.tenantId), eq(partyRoles.partyId, partyId)));
        if (held) return refuse(new Conflict({ message: TEAM_ALREADY_MEMBER }));
        await tx.insert(partyRoles).values({ partyId, tenantId: invite.tenantId, roleId: invite.roleId, roleScope: "tenant" });

        const groups = await tx
          .select({ groupId: tenantTeamInviteGroups.groupId })
          .from(tenantTeamInviteGroups)
          .where(eq(tenantTeamInviteGroups.inviteId, invite.id));
        if (groups.length > 0) {
          await tx.insert(tenantGroupMembers).values(groups.map(({ groupId }) => ({ groupId, tenantId: invite.tenantId, partyId })));
        }
        await insertAuditEntry(tx, {
          actorPartyId: partyId,
          action: "team.invite.accepted",
          subjectId: invite.id,
          tenantId: invite.tenantId,
          after: { role: role.key, groupIds: groups.map((group) => group.groupId) },
        });
        return { tenantId: invite.tenantId };
      }),
    catch: classify,
  });
