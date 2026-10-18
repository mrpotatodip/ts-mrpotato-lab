import { sql } from "drizzle-orm";
import { boolean, check, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

// -----
// Where a Role works: inside one Tenant, or
// across the platform with no Tenant.
// -----
export const ACCESS_SCOPE_VALUES = ["tenant", "platform"] as const;
export type AccessScope = (typeof ACCESS_SCOPE_VALUES)[number];

// -----
// The platform catalogue of Role types. Each
// Tenant's Role rows name one of these, and its
// Powers are the rows in access_role_powers for
// that Master Role. can_be_bound says whether
// its members can be limited to Countries or
// Locations; never on for a system or platform
// Role. key never changes. A Master
// Role is assignable only while enabled. System
// roles cannot be deleted, disabled or lose
// Powers.
// -----
export const accessMasterRoles = pgTable(
  "access_master_roles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    key: text("key").notNull(),
    label: text("label").notNull(),
    description: text("description"),
    scope: text("scope").$type<AccessScope>().notNull(),
    enabled: boolean("enabled").notNull().default(false),
    isSystem: boolean("is_system").notNull().default(false),
    canBeBound: boolean("can_be_bound").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => ({
    uqKey: uniqueIndex("uq_access_master_roles_key").on(t.key),
    uqIdScope: uniqueIndex("uq_access_master_roles_id_scope").on(t.id, t.scope),
    chkScope: check("access_master_roles_scope", sql`${t.scope} in ('tenant', 'platform')`),
    chkCanBeBound: check(
      "access_master_roles_can_be_bound",
      sql`not (${t.canBeBound} and (${t.isSystem} or ${t.scope} <> 'tenant'))`,
    ),
  }),
);

export const DEFAULT_MASTER_ROLES = [
  { key: "tenant_admin", label: "Tenant admin", scope: "tenant", enabled: true, isSystem: true, canBeBound: false },
  { key: "store_admin", label: "Store admin", scope: "tenant", enabled: true, isSystem: false, canBeBound: true },
  { key: "store_staff", label: "Store staff", scope: "tenant", enabled: true, isSystem: false, canBeBound: true },
  { key: "superuser", label: "Superuser", scope: "platform", enabled: true, isSystem: true, canBeBound: false },
] as const;

export type TAccessMasterRole = typeof accessMasterRoles.$inferSelect;
