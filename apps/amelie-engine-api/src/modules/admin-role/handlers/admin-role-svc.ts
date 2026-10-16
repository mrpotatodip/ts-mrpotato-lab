import { and, eq, inArray, sql } from "drizzle-orm";
import { Effect } from "effect";
import {
  accessAuditLog,
  accessMasterPowers,
  accessMasterRoles,
  accessRolePowers,
  roles,
  teamInvites,
  tenants,
} from "@repo/db-amelie";
import type {
  AdminAuditLog,
  AdminAuditQuery,
  AdminRoleDeleted,
  AdminRoleDetail,
  AdminRoles,
  CreateAdminRoleBody,
  UpdateAdminRoleBody,
} from "@repo/contracts/amelie";
import type { DbConnectType } from "#/lib/db-connection";
import { Conflict, Invalid, toDbError, type DbError, type NotFound } from "#/lib/effect-query";
import { PG_UNIQUE_VIOLATION, pgErrorCode, pgErrorConstraint } from "#/lib/pg-error";
import {
  ADMIN_POWER_UNKNOWN,
  ADMIN_ROLE_IN_USE,
  ADMIN_ROLE_KEY_CONSTRAINT,
  ADMIN_ROLE_KEY_TAKEN,
  ADMIN_ROLE_PLATFORM_LOCKED,
  ADMIN_ROLE_SYSTEM_LOCKED,
  ADMIN_ROLE_SYSTEM_POWERS,
} from "#/modules/admin-role/constants";
import {
  findActorPartyIdEffect,
  findAdminRoleEffect,
  getAdminRoleDetailEffect,
  listAdminAuditLogEffect,
  listAdminRolePowersEffect,
  listAdminRolesEffect,
} from "#/modules/admin-role/queries";

type Tx = Parameters<Parameters<DbConnectType["transaction"]>[0]>[0];
type RoleSummary = { key: string; label: string; description: string | null; enabled: boolean };
type AuditPayload = RoleSummary | (RoleSummary & { powers: string[] }) | { enabled: boolean } | { powers: string[] } | null;

const record = (
  tx: Tx,
  actorPartyId: string | null,
  action: string,
  subjectId: string,
  before: AuditPayload,
  after: AuditPayload,
) => tx.insert(accessAuditLog).values({ actorPartyId, action, subjectId, before, after });

const summary = (role: RoleSummary): RoleSummary => ({
  key: role.key,
  label: role.label,
  description: role.description,
  enabled: role.enabled,
});

const classifyCreate = (cause: unknown): Conflict | DbError =>
  pgErrorCode(cause) === PG_UNIQUE_VIOLATION && pgErrorConstraint(cause) === ADMIN_ROLE_KEY_CONSTRAINT
    ? new Conflict({ message: ADMIN_ROLE_KEY_TAKEN })
    : toDbError(cause);

export const listAdminRolesSvc = (db: DbConnectType): Effect.Effect<AdminRoles, DbError> =>
  listAdminRolesEffect(db);

export const getAdminRoleSvc = (
  db: DbConnectType,
  roleId: string,
): Effect.Effect<AdminRoleDetail, DbError | NotFound> => getAdminRoleDetailEffect(db, roleId);

export const listAdminAuditLogSvc = (
  db: DbConnectType,
  query: AdminAuditQuery,
): Effect.Effect<AdminAuditLog, DbError> => listAdminAuditLogEffect(db, query);

export const createAdminRoleSvc = (
  db: DbConnectType,
  userId: string,
  body: CreateAdminRoleBody,
): Effect.Effect<AdminRoleDetail, DbError | NotFound | Conflict> =>
  Effect.gen(function* () {
    const actor = yield* findActorPartyIdEffect(db, userId);
    const id = yield* Effect.tryPromise({
      try: () =>
        db.transaction(async (tx) => {
          const [created] = await tx
            .insert(accessMasterRoles)
            .values({
              key: body.key,
              label: body.label,
              description: body.description ?? null,
              scope: "tenant",
              enabled: false,
              isSystem: false,
            })
            .returning();
          await record(tx, actor, "role.created", created.id, null, summary(created));
          return created.id;
        }),
      catch: classifyCreate,
    });
    return yield* getAdminRoleDetailEffect(db, id);
  });

export const updateAdminRoleSvc = (
  db: DbConnectType,
  userId: string,
  roleId: string,
  body: UpdateAdminRoleBody,
): Effect.Effect<AdminRoleDetail, DbError | NotFound> =>
  Effect.gen(function* () {
    const role = yield* findAdminRoleEffect(db, roleId);
    const actor = yield* findActorPartyIdEffect(db, userId);
    const next = {
      label: body.label ?? role.label,
      description: body.description === undefined ? role.description : body.description,
    };
    if (next.label !== role.label || next.description !== role.description) {
      yield* Effect.tryPromise({
        try: () =>
          db.transaction(async (tx) => {
            await tx.update(accessMasterRoles).set(next).where(eq(accessMasterRoles.id, roleId));
            await record(tx, actor, "role.updated", roleId, summary(role), summary({ ...role, ...next }));
          }),
        catch: toDbError,
      });
    }
    return yield* getAdminRoleDetailEffect(db, roleId);
  });

export const setAdminRoleEnabledSvc = (
  db: DbConnectType,
  userId: string,
  roleId: string,
  enabled: boolean,
): Effect.Effect<AdminRoleDetail, DbError | NotFound | Conflict | Invalid> =>
  Effect.gen(function* () {
    const role = yield* findAdminRoleEffect(db, roleId);
    if (role.scope === "platform") return yield* new Invalid({ message: ADMIN_ROLE_PLATFORM_LOCKED });
    if (!enabled && role.isSystem) return yield* new Conflict({ message: ADMIN_ROLE_SYSTEM_LOCKED });
    if (role.enabled === enabled) return yield* getAdminRoleDetailEffect(db, roleId);
    const actor = yield* findActorPartyIdEffect(db, userId);
    yield* Effect.tryPromise({
      try: () =>
        db.transaction(async (tx) => {
          await tx.update(accessMasterRoles).set({ enabled }).where(eq(accessMasterRoles.id, roleId));
          if (enabled) {
            const tenantRows = await tx.select({ id: tenants.id }).from(tenants);
            if (tenantRows.length > 0) {
              await tx
                .insert(roles)
                .values(tenantRows.map((tenant) => ({ tenantId: tenant.id, masterRoleId: roleId, scope: role.scope })))
                .onConflictDoNothing();
            }
          }
          await record(
            tx,
            actor,
            enabled ? "role.enabled" : "role.disabled",
            roleId,
            { enabled: role.enabled },
            { enabled },
          );
        }),
      catch: toDbError,
    });
    return yield* getAdminRoleDetailEffect(db, roleId);
  });

export const setAdminRolePowersSvc = (
  db: DbConnectType,
  userId: string,
  roleId: string,
  powers: readonly string[],
): Effect.Effect<AdminRoleDetail, DbError | NotFound | Conflict | Invalid> =>
  Effect.gen(function* () {
    const role = yield* findAdminRoleEffect(db, roleId);
    const current = yield* listAdminRolePowersEffect(db, roleId);
    const next = [...new Set(powers)].toSorted();
    const known = yield* Effect.tryPromise({
      try: () =>
        next.length === 0
          ? Promise.resolve([])
          : db
              .select({ id: accessMasterPowers.id, power: accessMasterPowers.power })
              .from(accessMasterPowers)
              .where(and(inArray(accessMasterPowers.power, next), eq(accessMasterPowers.scope, role.scope))),
      catch: toDbError,
    });
    const knownSet = new Set(known.map((row) => row.power));
    const unknown = next.filter((power) => !knownSet.has(power));
    if (unknown.length > 0) {
      return yield* new Invalid({ message: `${ADMIN_POWER_UNKNOWN}: ${unknown.join(", ")}` });
    }
    const nextSet = new Set(next);
    const removed = current.filter((power) => !nextSet.has(power));
    if (role.isSystem && removed.length > 0) {
      return yield* new Conflict({ message: ADMIN_ROLE_SYSTEM_POWERS });
    }
    const currentSet = new Set(current);
    const added = known.filter((row) => !currentSet.has(row.power));
    if (removed.length === 0 && added.length === 0) return yield* getAdminRoleDetailEffect(db, roleId);
    const actor = yield* findActorPartyIdEffect(db, userId);
    yield* Effect.tryPromise({
      try: () =>
        db.transaction(async (tx) => {
          if (removed.length > 0) {
            const removedIds = await tx
              .select({ id: accessMasterPowers.id })
              .from(accessMasterPowers)
              .where(inArray(accessMasterPowers.power, removed));
            await tx.delete(accessRolePowers).where(
              and(
                eq(accessRolePowers.masterRoleId, roleId),
                inArray(
                  accessRolePowers.masterPowerId,
                  removedIds.map((row) => row.id),
                ),
              ),
            );
          }
          if (added.length > 0) {
            await tx
              .insert(accessRolePowers)
              .values(added.map((row) => ({ masterRoleId: roleId, masterPowerId: row.id, scope: role.scope })));
          }
          await record(tx, actor, "role.powers_set", roleId, { powers: current }, { powers: next });
        }),
      catch: toDbError,
    });
    return yield* getAdminRoleDetailEffect(db, roleId);
  });

export const deleteAdminRoleSvc = (
  db: DbConnectType,
  userId: string,
  roleId: string,
): Effect.Effect<AdminRoleDeleted, DbError | NotFound | Conflict> =>
  Effect.gen(function* () {
    const role = yield* findAdminRoleEffect(db, roleId);
    if (role.isSystem) return yield* new Conflict({ message: ADMIN_ROLE_SYSTEM_LOCKED });
    const invites = yield* Effect.tryPromise({
      try: () =>
        db
          .select({ n: sql<number>`count(*)::int` })
          .from(teamInvites)
          .innerJoin(roles, eq(roles.id, teamInvites.roleId))
          .where(eq(roles.masterRoleId, roleId)),
      catch: toDbError,
    });
    if (role.holderCount > 0 || (invites[0]?.n ?? 0) > 0) {
      return yield* new Conflict({ message: ADMIN_ROLE_IN_USE });
    }
    const powers = yield* listAdminRolePowersEffect(db, roleId);
    const actor = yield* findActorPartyIdEffect(db, userId);
    yield* Effect.tryPromise({
      try: () =>
        db.transaction(async (tx) => {
          await tx.delete(roles).where(eq(roles.masterRoleId, roleId));
          await tx.delete(accessMasterRoles).where(eq(accessMasterRoles.id, roleId));
          await record(tx, actor, "role.deleted", roleId, { ...summary(role), powers }, null);
        }),
      catch: toDbError,
    });
    return { id: roleId };
  });
