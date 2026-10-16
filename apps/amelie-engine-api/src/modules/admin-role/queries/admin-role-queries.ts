import { asc, desc, eq, sql } from "drizzle-orm";
import { Effect } from "effect";
import {
  accessAuditLog,
  accessMasterPowers,
  accessMasterRoles,
  accessRolePowers,
  authUser,
  partyRoles,
  roles,
} from "@repo/db-amelie";
import {
  AdminAuditEntrySchema,
  AdminRoleDetailSchema,
  AdminRoleSchema,
  type AdminAuditLog,
  type AdminRole,
  type AdminRoleDetail,
  type AdminRoles,
} from "@repo/contracts/amelie";
import type { DbConnectType } from "#/lib/db-connection";
import { NotFound, toDbError, type DbError } from "#/lib/effect-query";
import { ADMIN_ROLE_NOT_FOUND } from "#/modules/admin-role/constants";

const parseOwnRow = <A>(parse: () => A): Effect.Effect<A> => Effect.try(parse).pipe(Effect.orDie);

const roleColumns = {
  id: accessMasterRoles.id,
  key: accessMasterRoles.key,
  label: accessMasterRoles.label,
  description: accessMasterRoles.description,
  scope: accessMasterRoles.scope,
  enabled: accessMasterRoles.enabled,
  isSystem: accessMasterRoles.isSystem,
  powerCount: sql<number>`(
    select count(*)::int from ${accessRolePowers}
    where ${accessRolePowers.masterRoleId} = ${accessMasterRoles}."id"
  )`,
  holderCount: sql<number>`(
    select count(*)::int from ${partyRoles}
    join ${roles} on ${roles}."id" = ${partyRoles}."role_id"
    where ${roles}."master_role_id" = ${accessMasterRoles}."id"
  )`,
};

export const listAdminRolesEffect = (db: DbConnectType): Effect.Effect<AdminRoles, DbError> =>
  Effect.tryPromise({
    try: () =>
      db
        .select(roleColumns)
        .from(accessMasterRoles)
        .orderBy(asc(accessMasterRoles.createdAt), asc(accessMasterRoles.key)),
    catch: toDbError,
  }).pipe(Effect.flatMap((rows) => parseOwnRow(() => rows.map((row) => AdminRoleSchema.parse(row)))));

export const findAdminRoleEffect = (
  db: DbConnectType,
  roleId: string,
): Effect.Effect<AdminRole, DbError | NotFound> =>
  Effect.gen(function* () {
    const rows = yield* Effect.tryPromise({
      try: () => db.select(roleColumns).from(accessMasterRoles).where(eq(accessMasterRoles.id, roleId)).limit(1),
      catch: toDbError,
    });
    const [row] = rows;
    if (!row) return yield* new NotFound({ message: ADMIN_ROLE_NOT_FOUND });
    return yield* parseOwnRow(() => AdminRoleSchema.parse(row));
  });

export const listAdminRolePowersEffect = (
  db: DbConnectType,
  roleId: string,
): Effect.Effect<string[], DbError> =>
  Effect.tryPromise({
    try: () =>
      db
        .select({ power: accessMasterPowers.power })
        .from(accessRolePowers)
        .innerJoin(accessMasterPowers, eq(accessMasterPowers.id, accessRolePowers.masterPowerId))
        .where(eq(accessRolePowers.masterRoleId, roleId))
        .orderBy(asc(accessMasterPowers.power)),
    catch: toDbError,
  }).pipe(Effect.map((rows) => rows.map((row) => row.power)));

export const getAdminRoleDetailEffect = (
  db: DbConnectType,
  roleId: string,
): Effect.Effect<AdminRoleDetail, DbError | NotFound> =>
  Effect.gen(function* () {
    const role = yield* findAdminRoleEffect(db, roleId);
    const powers = yield* listAdminRolePowersEffect(db, roleId);
    return yield* parseOwnRow(() => AdminRoleDetailSchema.parse({ ...role, powers }));
  });

export const listAdminAuditLogEffect = (
  db: DbConnectType,
  query: { roleId?: string; limit: number },
): Effect.Effect<AdminAuditLog, DbError> =>
  Effect.tryPromise({
    try: () =>
      db
        .select({
          id: accessAuditLog.id,
          actorEmail: authUser.email,
          action: accessAuditLog.action,
          subjectId: accessAuditLog.subjectId,
          before: accessAuditLog.before,
          after: accessAuditLog.after,
          createdAt: accessAuditLog.createdAt,
        })
        .from(accessAuditLog)
        .leftJoin(authUser, eq(authUser.partyId, accessAuditLog.actorPartyId))
        .where(query.roleId ? eq(accessAuditLog.subjectId, query.roleId) : undefined)
        .orderBy(desc(accessAuditLog.createdAt))
        .limit(query.limit),
    catch: toDbError,
  }).pipe(
    Effect.flatMap((rows) =>
      parseOwnRow(() =>
        rows.map((row) => AdminAuditEntrySchema.parse({ ...row, createdAt: row.createdAt.toISOString() })),
      ),
    ),
  );

export const findActorPartyIdEffect = (
  db: DbConnectType,
  userId: string,
): Effect.Effect<string | null, DbError> =>
  Effect.tryPromise({
    try: () => db.select({ partyId: authUser.partyId }).from(authUser).where(eq(authUser.id, userId)).limit(1),
    catch: toDbError,
  }).pipe(Effect.map((rows) => rows[0]?.partyId ?? null));
