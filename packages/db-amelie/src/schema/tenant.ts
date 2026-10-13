import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  foreignKey,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { organizations, persons } from "./party";

const timestamps = () => ({
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

// -----
// The isolation boundary: every Tenant-owned
// row carries its own tenant_id.
// -----
export const tenants = pgTable(
  "tenants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationPartyId: uuid("organization_party_id")
      .notNull()
      .references(() => organizations.partyId, { onDelete: "restrict" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    allowedOrigins: text("allowed_origins")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    timezone: text("timezone").notNull(),
    ...timestamps(),
  },
  (t) => ({
    uqSlug: uniqueIndex("uq_tenants_slug").on(t.slug),
    idxOrganization: index("idx_tenants_organization_party_id").on(t.organizationPartyId),
  }),
);

// -----
// A Role: owner, manager and staff per Tenant,
// plus one global superuser with no Tenant.
// can_edit is what the API and dashboard read.
// -----
export const roles = pgTable(
  "roles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    canEdit: boolean("can_edit").notNull().default(false),
    ...timestamps(),
  },
  (t) => ({
    uqTenantKey: uniqueIndex("uq_roles_tenant_key").on(t.tenantId, t.key),
    uqGlobalKey: uniqueIndex("uq_roles_global_key")
      .on(t.key)
      .where(sql`${t.tenantId} is null`),
    uqIdTenant: uniqueIndex("uq_roles_id_tenant").on(t.id, t.tenantId),
    uqIdKey: uniqueIndex("uq_roles_id_key").on(t.id, t.key),
    chkSuperuserGlobal: check(
      "roles_superuser_global",
      sql`(${t.key} = 'superuser') = (${t.tenantId} is null)`,
    ),
  }),
);

// -----
// A Person holds a Role, in one Tenant for cafe
// roles. role_key copies the Role's key so the
// database can check the superuser rule.
// -----
export const partyRoles = pgTable(
  "party_roles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    partyId: uuid("party_id")
      .notNull()
      .references(() => persons.partyId, { onDelete: "cascade" }),
    roleId: uuid("role_id").notNull(),
    roleKey: text("role_key").notNull(),
    tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: "cascade" }),
    ...timestamps(),
  },
  (t) => ({
    fkRole: foreignKey({
      name: "party_roles_role_fk",
      columns: [t.roleId, t.roleKey],
      foreignColumns: [roles.id, roles.key],
    }).onDelete("cascade"),
    fkRoleTenant: foreignKey({
      name: "party_roles_role_tenant_fk",
      columns: [t.roleId, t.tenantId],
      foreignColumns: [roles.id, roles.tenantId],
    }).onDelete("cascade"),
    uqTenantParty: uniqueIndex("uq_party_roles_tenant_party").on(t.tenantId, t.partyId),
    uqSuperuser: uniqueIndex("uq_party_roles_superuser")
      .on(t.partyId)
      .where(sql`${t.roleKey} = 'superuser'`),
    idxParty: index("idx_party_roles_party_id").on(t.partyId),
    chkSuperuserGlobal: check(
      "party_roles_superuser_global",
      sql`(${t.roleKey} = 'superuser') = (${t.tenantId} is null)`,
    ),
  }),
);

// -----
// The one global Role, held by platform staff.
// Twin of "superuser" in ROLE_KEY_VALUES.
// -----
export const SUPERUSER_ROLE_KEY = "superuser";

// -----
// The Roles every new Tenant gets. Twin of
// TENANT_ROLE_KEY_VALUES in @repo/contracts/amelie
// and of the 0014 migration; change all three.
// -----
export const DEFAULT_TENANT_ROLES = [
  { key: "owner", canEdit: true },
  { key: "manager", canEdit: true },
  { key: "staff", canEdit: false },
] as const;

export type TTenant =typeof tenants.$inferSelect;
export type TRole = typeof roles.$inferSelect;
export type TPartyRole = typeof partyRoles.$inferSelect;
