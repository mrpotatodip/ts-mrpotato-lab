import { and, asc, eq, isNotNull } from "drizzle-orm";
import { Effect } from "effect";
import {
  accessMasterPowers,
  accessMasterRoles,
  accessRolePowers,
  authUser,
  parties,
  partyMasterRoles,
  partyMasterTypes,
  partyRoles,
  SUPERUSER_ROLE_KEY,
  tenants,
} from "@repo/db-elise";
import type { AccessPower, Me, MeAccount } from "@repo/contracts/elise";
import type { DbConnectType } from "#/lib/db-connection";
import { NotFound, toDbError, type DbError } from "#/lib/effect-query";

// -----
// The login, the type of its Party, the Accounts
// it holds a Role in, and whether it is platform
// staff: three reads, none of them cached.
// -----
export const getMeEffect = (db: DbConnectType, userId: string): Effect.Effect<Me, DbError | NotFound> =>
  Effect.gen(function* () {
    const [login] = yield* Effect.tryPromise({
      try: () =>
        db
          .select({
            id: authUser.id,
            name: authUser.name,
            email: authUser.email,
            partyId: authUser.partyId,
            partyType: partyMasterTypes.key,
          })
          .from(authUser)
          .innerJoin(parties, eq(parties.id, authUser.partyId))
          .innerJoin(partyMasterTypes, eq(partyMasterTypes.id, parties.masterTypeId))
          .where(eq(authUser.id, userId)),
      catch: toDbError,
    });
    if (!login) return yield* new NotFound({ message: "Login not found" });

    const rows = yield* Effect.tryPromise({
      try: () =>
        db
          .select({
            id: tenants.id,
            name: tenants.name,
            slug: tenants.slug,
            role: accessMasterRoles.key,
            roleLabel: accessMasterRoles.label,
          })
          .from(partyRoles)
          .innerJoin(tenants, eq(tenants.id, partyRoles.tenantId))
          .innerJoin(partyMasterRoles, eq(partyMasterRoles.id, partyRoles.roleId))
          .innerJoin(accessMasterRoles, eq(accessMasterRoles.id, partyMasterRoles.masterRoleId))
          .where(and(eq(partyRoles.partyId, login.partyId), isNotNull(partyRoles.tenantId)))
          .orderBy(asc(tenants.name)),
      catch: toDbError,
    });

    const granted = yield* Effect.tryPromise({
      try: () =>
        db
          .select({ tenantId: partyRoles.tenantId, power: accessMasterPowers.power })
          .from(partyRoles)
          .innerJoin(partyMasterRoles, eq(partyMasterRoles.id, partyRoles.roleId))
          .innerJoin(accessRolePowers, eq(accessRolePowers.masterRoleId, partyMasterRoles.masterRoleId))
          .innerJoin(accessMasterPowers, eq(accessMasterPowers.id, accessRolePowers.masterPowerId))
          .where(and(eq(partyRoles.partyId, login.partyId), isNotNull(partyRoles.tenantId)))
          .orderBy(asc(accessMasterPowers.power)),
      catch: toDbError,
    });
    const accounts: MeAccount[] = rows.map((row) => ({
      ...row,
      powers: granted.filter((grant) => grant.tenantId === row.id).map((grant) => grant.power),
    }));

    const staff = yield* Effect.tryPromise({
      try: () =>
        db
          .select({ id: partyRoles.id })
          .from(partyRoles)
          .innerJoin(partyMasterRoles, eq(partyMasterRoles.id, partyRoles.roleId))
          .innerJoin(accessMasterRoles, eq(accessMasterRoles.id, partyMasterRoles.masterRoleId))
          .where(and(eq(partyRoles.partyId, login.partyId), eq(accessMasterRoles.key, SUPERUSER_ROLE_KEY)))
          .limit(1),
      catch: toDbError,
    });

    return {
      user: { id: login.id, name: login.name, email: login.email },
      partyType: login.partyType,
      isSuperuser: staff.length > 0,
      accounts,
    };
  });

// -----
// Does this login hold a Role in this Account?
// The guard for a signed-in caller of /scans.
// -----
export const userHasAccountEffect = (db: DbConnectType, userId: string, accountId: string): Effect.Effect<boolean, DbError> =>
  Effect.tryPromise({
    try: () =>
      db
        .select({ id: partyRoles.id })
        .from(partyRoles)
        .innerJoin(authUser, eq(authUser.partyId, partyRoles.partyId))
        .where(and(eq(authUser.id, userId), eq(partyRoles.tenantId, accountId)))
        .limit(1),
    catch: toDbError,
  }).pipe(Effect.map((rows) => rows.length > 0));

// -----
// Does this login hold this Power in this Account? A Role holds
// the Powers granted to its Master Role. The guard for its team,
// groups, GitHub connection and accepted risks.
// -----
export const userHasPowerEffect = (db: DbConnectType, userId: string, accountId: string, power: AccessPower): Effect.Effect<boolean, DbError> =>
  Effect.tryPromise({
    try: () =>
      db
        .select({ id: partyRoles.id })
        .from(partyRoles)
        .innerJoin(authUser, eq(authUser.partyId, partyRoles.partyId))
        .innerJoin(partyMasterRoles, eq(partyMasterRoles.id, partyRoles.roleId))
        .innerJoin(accessRolePowers, eq(accessRolePowers.masterRoleId, partyMasterRoles.masterRoleId))
        .innerJoin(accessMasterPowers, eq(accessMasterPowers.id, accessRolePowers.masterPowerId))
        .where(and(eq(authUser.id, userId), eq(partyRoles.tenantId, accountId), eq(accessMasterPowers.power, power)))
        .limit(1),
    catch: toDbError,
  }).pipe(Effect.map((rows) => rows.length > 0));
