import { and, eq, isNull } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { accessMasterRoles, authUser, partyRoles, roles, SUPERUSER_ROLE_KEY } from "../schema";

export type AddSuperuserDb = PgDatabase<PgQueryResultHKT, Record<string, unknown>>;

export type AddSuperuserResult = { email: string; added: boolean };

// -----
// Makes an existing login a superuser. Safe to
// run twice: the second run changes nothing.
// -----
export async function addSuperuser(db: AddSuperuserDb, email: string): Promise<AddSuperuserResult> {
  const [login] = await db.select().from(authUser).where(eq(authUser.email, email));
  if (!login) throw new Error(`No login has the email ${email}`);

  const [master] = await db.select().from(accessMasterRoles).where(eq(accessMasterRoles.key, SUPERUSER_ROLE_KEY));
  if (!master) throw new Error(`No Master Role has the key ${SUPERUSER_ROLE_KEY}`);
  await db
    .insert(roles)
    .values({ tenantId: null, masterRoleId: master.id, scope: master.scope })
    .onConflictDoNothing();
  const [role] = await db
    .select()
    .from(roles)
    .where(and(isNull(roles.tenantId), eq(roles.masterRoleId, master.id)));

  const inserted = await db
    .insert(partyRoles)
    .values({ partyId: login.partyId, tenantId: null, roleId: role.id, roleScope: role.scope })
    .onConflictDoNothing()
    .returning({ id: partyRoles.id });

  return { email, added: inserted.length > 0 };
}
