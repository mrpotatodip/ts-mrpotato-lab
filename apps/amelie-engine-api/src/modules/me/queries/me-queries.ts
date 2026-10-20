import { and, eq } from "drizzle-orm";
import { Effect } from "effect";
import { accessMasterRoles, authUser, partyRoles, roles, SUPERUSER_ROLE_KEY } from "@repo/db-amelie";
import type { DbConnectType } from "#/lib/db-connection";
import { toDbError, type DbError } from "#/lib/effect-query";

export const isSuperuserEffect = (
  db: DbConnectType,
  userId: string,
): Effect.Effect<boolean, DbError> =>
  Effect.tryPromise({
    try: () =>
      db
        .select({ id: partyRoles.id })
        .from(partyRoles)
        .innerJoin(authUser, eq(authUser.partyId, partyRoles.partyId))
        .innerJoin(roles, eq(roles.id, partyRoles.roleId))
        .innerJoin(accessMasterRoles, eq(accessMasterRoles.id, roles.masterRoleId))
        .where(and(eq(authUser.id, userId), eq(accessMasterRoles.key, SUPERUSER_ROLE_KEY)))
        .limit(1),
    catch: toDbError,
  }).pipe(Effect.map((rows) => rows.length > 0));
