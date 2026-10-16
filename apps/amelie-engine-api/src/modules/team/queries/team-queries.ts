import { and, asc, eq, gt, isNull, sql } from "drizzle-orm";
import { Effect } from "effect";
import {
  type AccessScope,
  accessMasterPowers,
  accessRolePowers,
  authUser,
  partyRoles,
  persons,
  accessMasterRoles,
  roles,
  teamInvites,
  tenants,
} from "@repo/db-amelie";
import {
  TeamInvitePreviewSchema,
  TeamInviteSchema,
  TeamListSchema,
  TeamMemberSchema,
  TENANT_ADMIN_ROLE_KEY,
  type TeamInvite,
  type TeamInvitePreview,
  type TeamList,
  type TeamMember,
  type TeamRoles,
} from "@repo/contracts/amelie";
import type { DbConnectType } from "#/lib/db-connection";
import { NotFound, toDbError, type DbError } from "#/lib/effect-query";
import { TEAM_MEMBER_NOT_FOUND, TEAM_NOT_FOUND } from "#/modules/team/constants";

const parseOwnRow = <A>(parse: () => A): Effect.Effect<A> => Effect.try(parse).pipe(Effect.orDie);

const toInvite = (row: {
  id: string;
  email: string;
  roleKey: string;
  roleLabel: string;
  expiresAt: Date;
  createdAt: Date;
}): TeamInvite =>
  TeamInviteSchema.parse({
    id: row.id,
    email: row.email,
    role: row.roleKey,
    roleLabel: row.roleLabel,
    expiresAt: row.expiresAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
  });

export const listTeamEffect = (db: DbConnectType, tenantId: string): Effect.Effect<TeamList, DbError> =>
  Effect.gen(function* () {
    const memberRows = yield* Effect.tryPromise({
      try: () =>
        db
          .select({
            partyId: persons.partyId,
            firstName: persons.firstName,
            lastName: persons.lastName,
            email: authUser.email,
            role: accessMasterRoles.key,
            roleLabel: accessMasterRoles.label,
          })
          .from(partyRoles)
          .innerJoin(roles, eq(roles.id, partyRoles.roleId))
          .innerJoin(accessMasterRoles, eq(accessMasterRoles.id, roles.masterRoleId))
          .innerJoin(persons, eq(persons.partyId, partyRoles.partyId))
          .innerJoin(authUser, eq(authUser.partyId, partyRoles.partyId))
          .where(eq(partyRoles.tenantId, tenantId))
          .orderBy(asc(persons.firstName), asc(persons.lastName), asc(authUser.email)),
      catch: toDbError,
    });
    const inviteRows = yield* Effect.tryPromise({
      try: () =>
        db
          .select({
            id: teamInvites.id,
            email: teamInvites.email,
            roleKey: accessMasterRoles.key,
            roleLabel: accessMasterRoles.label,
            expiresAt: teamInvites.expiresAt,
            createdAt: teamInvites.createdAt,
          })
          .from(teamInvites)
          .innerJoin(roles, eq(roles.id, teamInvites.roleId))
          .innerJoin(accessMasterRoles, eq(accessMasterRoles.id, roles.masterRoleId))
          .where(
            and(eq(teamInvites.tenantId, tenantId), isNull(teamInvites.revokedAt), isNull(teamInvites.acceptedAt)),
          )
          .orderBy(asc(teamInvites.createdAt)),
      catch: toDbError,
    });
        const members: TeamMember[] = memberRows.map((row) =>
      TeamMemberSchema.parse({
        partyId: row.partyId,
        name: `${row.firstName} ${row.lastName}`.trim(),
        email: row.email,
        role: row.role,
        roleLabel: row.roleLabel,
      }),
    );
    return yield* parseOwnRow(() =>
      TeamListSchema.parse({
        members,
        invites: inviteRows.map(toInvite),
      }),
    );
  });

export const findPartyIdByUserIdEffect = (
  db: DbConnectType,
  userId: string,
): Effect.Effect<string, DbError | NotFound> =>
  Effect.gen(function* () {
    const rows = yield* Effect.tryPromise({
      try: () => db.select({ partyId: authUser.partyId }).from(authUser).where(eq(authUser.id, userId)).limit(1),
      catch: toDbError,
    });
    const [row] = rows;
    if (!row) return yield* new NotFound({ message: TEAM_NOT_FOUND });
    return row.partyId;
  });

export const findRoleInTenantEffect = (
  db: DbConnectType,
  tenantId: string,
  roleKey: string,
): Effect.Effect<{ id: string; key: string; scope: AccessScope; masterRoleId: string }, DbError | NotFound> =>
  Effect.gen(function* () {
    const rows = yield* Effect.tryPromise({
      try: () =>
        db
          .select({ id: roles.id, key: accessMasterRoles.key, scope: roles.scope, masterRoleId: roles.masterRoleId })
          .from(roles)
          .innerJoin(accessMasterRoles, eq(accessMasterRoles.id, roles.masterRoleId))
          .where(
            and(
              eq(roles.tenantId, tenantId),
              eq(accessMasterRoles.key, roleKey),
              eq(accessMasterRoles.scope, "tenant"),
              eq(accessMasterRoles.enabled, true),
            ),
          )
          .limit(1),
      catch: toDbError,
    });
    const [row] = rows;
    if (!row) return yield* new NotFound({ message: TEAM_NOT_FOUND });
    return row;
  });

// -----
// The Powers a Master Role grants.
// -----
export const masterRolePowersEffect = (
  db: DbConnectType,
  masterRoleId: string,
): Effect.Effect<string[], DbError> =>
  Effect.tryPromise({
    try: () =>
      db
        .select({ power: accessMasterPowers.power })
        .from(accessRolePowers)
        .innerJoin(accessMasterPowers, eq(accessMasterPowers.id, accessRolePowers.masterPowerId))
        .where(eq(accessRolePowers.masterRoleId, masterRoleId)),
    catch: toDbError,
  }).pipe(Effect.map((rows) => rows.map((row) => row.power)));

// -----
// Every Role this Tenant can assign: enabled
// tenant Master Roles whose Powers the caller
// holds in full, fewest Powers first.
// -----
export const listAssignableRolesEffect = (
  db: DbConnectType,
  tenantId: string,
  callerPowers: readonly string[],
): Effect.Effect<TeamRoles, DbError> =>
  Effect.gen(function* () {
    const candidates = yield* Effect.tryPromise({
      try: () =>
        db
          .select({
            masterRoleId: accessMasterRoles.id,
            key: accessMasterRoles.key,
            label: accessMasterRoles.label,
            description: accessMasterRoles.description,
          })
          .from(roles)
          .innerJoin(accessMasterRoles, eq(accessMasterRoles.id, roles.masterRoleId))
          .where(
            and(
              eq(roles.tenantId, tenantId),
              eq(accessMasterRoles.scope, "tenant"),
              eq(accessMasterRoles.enabled, true),
            ),
          )
          .orderBy(asc(accessMasterRoles.createdAt), asc(accessMasterRoles.key)),
      catch: toDbError,
    });
    const held = new Set(callerPowers);
    const withPowers = yield* Effect.forEach(candidates, (candidate) =>
      masterRolePowersEffect(db, candidate.masterRoleId).pipe(Effect.map((powers) => ({ candidate, powers }))),
    );
    return withPowers
      .filter(({ powers }) => powers.every((power) => held.has(power)))
      .toSorted((a, b) => a.powers.length - b.powers.length)
      .map(({ candidate }) => ({ key: candidate.key, label: candidate.label, description: candidate.description }));
  });

export const countTenantAdminsEffect = (
  db: DbConnectType,
  tenantId: string,
): Effect.Effect<number, DbError> =>
  Effect.gen(function* () {
    const rows = yield* Effect.tryPromise({
      try: () =>
        db
          .select({ n: sql<number>`count(*)::int` })
          .from(partyRoles)
          .innerJoin(roles, eq(roles.id, partyRoles.roleId))
          .innerJoin(accessMasterRoles, eq(accessMasterRoles.id, roles.masterRoleId))
          .where(and(eq(partyRoles.tenantId, tenantId), eq(accessMasterRoles.key, TENANT_ADMIN_ROLE_KEY))),
      catch: toDbError,
    });
    return rows[0]?.n ?? 0;
  });

export const findMemberRoleEffect = (
  db: DbConnectType,
  tenantId: string,
  partyId: string,
): Effect.Effect<{ roleKey: string; masterRoleId: string }, DbError | NotFound> =>
  Effect.gen(function* () {
    const rows = yield* Effect.tryPromise({
      try: () =>
        db
          .select({ roleKey: accessMasterRoles.key, masterRoleId: roles.masterRoleId })
          .from(partyRoles)
          .innerJoin(roles, eq(roles.id, partyRoles.roleId))
          .innerJoin(accessMasterRoles, eq(accessMasterRoles.id, roles.masterRoleId))
          .where(and(eq(partyRoles.tenantId, tenantId), eq(partyRoles.partyId, partyId)))
          .limit(1),
      catch: toDbError,
    });
    const [row] = rows;
    if (!row) return yield* new NotFound({ message: TEAM_MEMBER_NOT_FOUND });
    return row;
  });

export const emailOnTenantEffect = (
  db: DbConnectType,
  tenantId: string,
  email: string,
): Effect.Effect<boolean, DbError> =>
  Effect.gen(function* () {
    const rows = yield* Effect.tryPromise({
      try: () =>
        db
          .select({ id: partyRoles.id })
          .from(partyRoles)
          .innerJoin(authUser, eq(authUser.partyId, partyRoles.partyId))
          .where(and(eq(partyRoles.tenantId, tenantId), eq(authUser.email, email)))
          .limit(1),
      catch: toDbError,
    });
    return rows.length > 0;
  });

export const findUserByEmailEffect = (
  db: DbConnectType,
  email: string,
): Effect.Effect<{ userId: string; partyId: string; email: string } | null, DbError> =>
  Effect.gen(function* () {
    const rows = yield* Effect.tryPromise({
      try: () =>
        db
          .select({ userId: authUser.id, partyId: authUser.partyId, email: authUser.email })
          .from(authUser)
          .where(eq(authUser.email, email))
          .limit(1),
      catch: toDbError,
    });
    return rows[0] ?? null;
  });

export const getTeamInviteByIdEffect = (
  db: DbConnectType,
  tenantId: string,
  inviteId: string,
): Effect.Effect<TeamInvite, DbError | NotFound> =>
  Effect.gen(function* () {
    const rows = yield* Effect.tryPromise({
      try: () =>
        db
          .select({
            id: teamInvites.id,
            email: teamInvites.email,
            roleKey: accessMasterRoles.key,
            roleLabel: accessMasterRoles.label,
            expiresAt: teamInvites.expiresAt,
            createdAt: teamInvites.createdAt,
          })
          .from(teamInvites)
          .innerJoin(roles, eq(roles.id, teamInvites.roleId))
          .innerJoin(accessMasterRoles, eq(accessMasterRoles.id, roles.masterRoleId))
          .where(
            and(
              eq(teamInvites.id, inviteId),
              eq(teamInvites.tenantId, tenantId),
              isNull(teamInvites.revokedAt),
              isNull(teamInvites.acceptedAt),
            ),
          )
          .limit(1),
      catch: toDbError,
    });
    const [row] = rows;
    if (!row) return yield* new NotFound({ message: TEAM_NOT_FOUND });
    return yield* parseOwnRow(() => toInvite(row));
  });

export const findOpenInviteByTokenHashEffect = (
  db: DbConnectType,
  tokenHash: string,
  now: Date,
) =>
  Effect.tryPromise({
    try: () =>
      db
        .select({
          id: teamInvites.id,
          tenantId: teamInvites.tenantId,
          email: teamInvites.email,
          roleKey: accessMasterRoles.key,
          roleLabel: accessMasterRoles.label,
          cafeName: tenants.name,
        })
        .from(teamInvites)
        .innerJoin(tenants, eq(tenants.id, teamInvites.tenantId))
        .innerJoin(roles, eq(roles.id, teamInvites.roleId))
        .innerJoin(accessMasterRoles, eq(accessMasterRoles.id, roles.masterRoleId))
        .where(
          and(
            eq(teamInvites.tokenHash, tokenHash),
            isNull(teamInvites.revokedAt),
            isNull(teamInvites.acceptedAt),
            gt(teamInvites.expiresAt, now),
          ),
        )
        .limit(1),
    catch: toDbError,
  });

export const toPreview = (
  row: { cafeName: string; email: string; roleKey: string; roleLabel: string },
  hasAccount: boolean,
): TeamInvitePreview =>
  TeamInvitePreviewSchema.parse({
    cafeName: row.cafeName,
    email: row.email,
    role: row.roleKey,
    roleLabel: row.roleLabel,
    hasAccount,
  });
