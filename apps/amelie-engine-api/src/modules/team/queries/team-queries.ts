import { and, asc, eq, gt, inArray, isNull, sql } from "drizzle-orm";
import { Effect } from "effect";
import {
  type AccessScope,
  accessMasterPowers,
  accessRolePowers,
  authUser,
  partyRoles,
  partyRoleScopes,
  persons,
  accessMasterRoles,
  roles,
  teamInvites,
  tenantCountries,
  tenantLocations,
  tenants,
} from "@repo/db-amelie";
import {
  TeamInvitePreviewSchema,
  TeamInviteSchema,
  TeamListSchema,
  TeamMemberSchema,
  TENANT_ADMIN_ROLE_KEY,
  type TeamBinding,
  type TeamInvite,
  type TeamInvitePreview,
  type TeamList,
  type TeamMember,
  type TeamRoles,
} from "@repo/contracts/amelie";
import type { DbConnectType } from "#/lib/db-connection";
import { Invalid, NotFound, toDbError, type DbError } from "#/lib/effect-query";
import { TEAM_BINDING_NOT_IN_TENANT, TEAM_MEMBER_NOT_FOUND, TEAM_NOT_FOUND } from "#/modules/team/constants";
import { sortBindings } from "#/modules/team/lib";

const parseOwnRow = <A>(parse: () => A): Effect.Effect<A> => Effect.try(parse).pipe(Effect.orDie);

const toBinding = (row: { countryId: string | null; locationId: string | null }): TeamBinding =>
  row.countryId ? { kind: "country", id: row.countryId } : { kind: "location", id: row.locationId ?? "" };

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
            partyRoleId: partyRoles.id,
            canBeBound: accessMasterRoles.canBeBound,
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
    const scopeRows = yield* Effect.tryPromise({
      try: () =>
        db
          .select({
            partyRoleId: partyRoleScopes.partyRoleId,
            countryId: partyRoleScopes.countryId,
            locationId: partyRoleScopes.locationId,
          })
          .from(partyRoleScopes)
          .where(eq(partyRoleScopes.tenantId, tenantId)),
      catch: toDbError,
    });
    const bindingsOf = (partyRoleId: string): TeamBinding[] =>
      sortBindings(scopeRows.filter((row) => row.partyRoleId === partyRoleId).map(toBinding));
    const members: TeamMember[] = memberRows.map((row) =>
      TeamMemberSchema.parse({
        partyId: row.partyId,
        name: `${row.firstName} ${row.lastName}`.trim(),
        email: row.email,
        role: row.role,
        roleLabel: row.roleLabel,
        canBeBound: row.canBeBound,
        bindings: bindingsOf(row.partyRoleId),
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
): Effect.Effect<
  { id: string; key: string; scope: AccessScope; masterRoleId: string; canBeBound: boolean },
  DbError | NotFound
> =>
  Effect.gen(function* () {
    const rows = yield* Effect.tryPromise({
      try: () =>
        db
          .select({
            id: roles.id,
            key: accessMasterRoles.key,
            scope: roles.scope,
            masterRoleId: roles.masterRoleId,
            canBeBound: accessMasterRoles.canBeBound,
          })
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
            canBeBound: accessMasterRoles.canBeBound,
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
      .map(({ candidate }) => ({
        key: candidate.key,
        label: candidate.label,
        description: candidate.description,
        canBeBound: candidate.canBeBound,
      }));
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
): Effect.Effect<{ partyRoleId: string; roleKey: string; masterRoleId: string }, DbError | NotFound> =>
  Effect.gen(function* () {
    const rows = yield* Effect.tryPromise({
      try: () =>
        db
          .select({ partyRoleId: partyRoles.id, roleKey: accessMasterRoles.key, masterRoleId: roles.masterRoleId })
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

// -----
// A member's Bindings as stored.
// -----
export const listMemberBindingsEffect = (
  db: DbConnectType,
  tenantId: string,
  partyRoleId: string,
): Effect.Effect<TeamBinding[], DbError> =>
  Effect.tryPromise({
    try: () =>
      db
        .select({ countryId: partyRoleScopes.countryId, locationId: partyRoleScopes.locationId })
        .from(partyRoleScopes)
        .where(and(eq(partyRoleScopes.tenantId, tenantId), eq(partyRoleScopes.partyRoleId, partyRoleId))),
    catch: toDbError,
  }).pipe(Effect.map((rows) => sortBindings(rows.map(toBinding))));

// -----
// Checks every Country and Location belongs to this
// Tenant (archived ones included: a kept Binding may
// name one) and returns each Location's Country, so
// the caller can fold.
// -----
export const resolveBindingTargetsEffect = (
  db: DbConnectType,
  tenantId: string,
  bindings: readonly TeamBinding[],
): Effect.Effect<Map<string, string>, DbError | Invalid> =>
  Effect.gen(function* () {
    const countryIds = [...new Set(bindings.filter((b) => b.kind === "country").map((b) => b.id))];
    const locationIds = [...new Set(bindings.filter((b) => b.kind === "location").map((b) => b.id))];
    const countries = countryIds.length
      ? yield* Effect.tryPromise({
          try: () =>
            db
              .select({ id: tenantCountries.id })
              .from(tenantCountries)
              .where(and(eq(tenantCountries.tenantId, tenantId), inArray(tenantCountries.id, countryIds))),
          catch: toDbError,
        })
      : [];
    const locations = locationIds.length
      ? yield* Effect.tryPromise({
          try: () =>
            db
              .select({ id: tenantLocations.id, countryId: tenantLocations.countryId })
              .from(tenantLocations)
              .where(and(eq(tenantLocations.tenantId, tenantId), inArray(tenantLocations.id, locationIds))),
          catch: toDbError,
        })
      : [];
    if (countries.length !== countryIds.length || locations.length !== locationIds.length) {
      return yield* new Invalid({ message: TEAM_BINDING_NOT_IN_TENANT });
    }
    return new Map(locations.map((row) => [row.id, row.countryId]));
  });
