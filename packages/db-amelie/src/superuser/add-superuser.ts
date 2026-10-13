import { and, eq, isNull } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { authUser, partyRoles, roles, SUPERUSER_ROLE_KEY } from "../schema";

export type AddSuperuserDb = PgDatabase<PgQueryResultHKT, Record<string, unknown>>;

export type AddSuperuserResult = { email: string; added: boolean };

// -----
// Makes an existing login a superuser. Safe to
// run twice: the second run changes nothing.
// -----
export async function addSuperuser(db: AddSuperuserDb, email: string): Promise<AddSuperuserResult> {
  const [login] = await db.select().from(authUser).where(eq(authUser.email, email));
  if (!login) throw new Error(`No login has the email ${email}`);

  await db
    .insert(roles)
    .values({ tenantId: null, key: SUPERUSER_ROLE_KEY, canEdit: false })
    .onConflictDoNothing();
  const [role] = await db
    .select()
    .from(roles)
    .where(and(isNull(roles.tenantId), eq(roles.key, SUPERUSER_ROLE_KEY)));

  const inserted = await db
    .insert(partyRoles)
    .values({ partyId: login.partyId, tenantId: null, roleId: role.id, roleKey: role.key })
    .onConflictDoNothing()
    .returning({ id: partyRoles.id });

  return { email, added: inserted.length > 0 };
}
