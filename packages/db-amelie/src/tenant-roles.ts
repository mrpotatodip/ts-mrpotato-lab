import { and, eq } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { accessMasterRoles, roles } from "./schema";

export type TenantRolesDb = PgDatabase<PgQueryResultHKT, Record<string, unknown>>;

// -----
// Gives a Tenant a Role row for every enabled
// tenant Master Role. Safe to run twice.
// -----
export async function ensureTenantRoles(db: TenantRolesDb, tenantId: string) {
  const masters = await db
    .select({ id: accessMasterRoles.id, scope: accessMasterRoles.scope })
    .from(accessMasterRoles)
    .where(and(eq(accessMasterRoles.scope, "tenant"), eq(accessMasterRoles.enabled, true)));
  if (masters.length === 0) return;
  await db
    .insert(roles)
    .values(masters.map((master) => ({ tenantId, masterRoleId: master.id, scope: master.scope })))
    .onConflictDoNothing();
}

// -----
// A Tenant's Role for a Master Role key, with
// the Master Role's state, or undefined.
// -----
export async function findTenantRole(db: TenantRolesDb, tenantId: string, key: string) {
  const [row] = await db
    .select({
      id: roles.id,
      scope: roles.scope,
      masterRoleId: roles.masterRoleId,
      key: accessMasterRoles.key,
      label: accessMasterRoles.label,
      enabled: accessMasterRoles.enabled,
    })
    .from(roles)
    .innerJoin(accessMasterRoles, eq(accessMasterRoles.id, roles.masterRoleId))
    .where(and(eq(roles.tenantId, tenantId), eq(accessMasterRoles.key, key)));
  return row;
}
