import { and, eq } from "drizzle-orm";
import { Effect } from "effect";
import { authUser, partyRoles, SUPERUSER_ROLE_KEY } from "@repo/db-amelie";
import type { DbConnectType } from "#/lib/db-connection";
import { toDbError, type DbError } from "#/lib/effect-query";

// -----
// A login is a superuser only through its
// Person's global superuser party_roles row.
// -----
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
        .where(and(eq(authUser.id, userId), eq(partyRoles.roleKey, SUPERUSER_ROLE_KEY)))
        .limit(1),
    catch: toDbError,
  }).pipe(Effect.map((rows) => rows.length > 0));
