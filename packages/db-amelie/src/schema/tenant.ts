import { sql } from "drizzle-orm";
import {
  check,
  foreignKey,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { accessMasterRoles, type AccessScope } from "./access-master-roles";
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
    customerChatLabel: text("customer_chat_label").notNull().default("Chat with us"),
    customerChatAccent: text("customer_chat_accent"),
    timezone: text("timezone").notNull(),
    ...timestamps(),
  },
  (t) => ({
    uqSlug: uniqueIndex("uq_tenants_slug").on(t.slug),
    idxOrganization: index("idx_tenants_organization_party_id").on(t.organizationPartyId),
  }),
);

// -----
// A Role is what the party system points at.
// It is one Master Role's instance in one
// Tenant, or the global platform one with no
// Tenant. The Powers come from the Master Role,
// never from this row, so who holds a Role stays
// apart from what it may do. scope is copied
// from the Master Role so the database can check
// the Tenant rule.
// -----
export const roles = pgTable(
  "roles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: "cascade" }),
    masterRoleId: uuid("master_role_id").notNull(),
    scope: text("scope").$type<AccessScope>().notNull(),
    ...timestamps(),
  },
  (t) => ({
    fkMasterRole: foreignKey({
      name: "roles_master_role_fk",
      columns: [t.masterRoleId, t.scope],
      foreignColumns: [accessMasterRoles.id, accessMasterRoles.scope],
    }).onDelete("restrict"),
    uqTenantMasterRole: uniqueIndex("uq_roles_tenant_master_role").on(t.tenantId, t.masterRoleId),
    uqGlobalMasterRole: uniqueIndex("uq_roles_global_master_role")
      .on(t.masterRoleId)
      .where(sql`${t.tenantId} is null`),
    uqIdTenant: uniqueIndex("uq_roles_id_tenant").on(t.id, t.tenantId),
    uqIdScope: uniqueIndex("uq_roles_id_scope").on(t.id, t.scope),
    idxMasterRole: index("idx_roles_master_role_id").on(t.masterRoleId),
    chkScopeTenant: check("roles_scope_tenant", sql`(${t.scope} = 'platform') = (${t.tenantId} is null)`),
  }),
);

// -----
// A Person holds a Role, in one Tenant for
// tenant roles. role_scope copies the Role's
// scope so the database can check the platform
// rule.
// -----
export const partyRoles = pgTable(
  "party_roles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    partyId: uuid("party_id")
      .notNull()
      .references(() => persons.partyId, { onDelete: "cascade" }),
    roleId: uuid("role_id").notNull(),
    roleScope: text("role_scope").$type<AccessScope>().notNull(),
    tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: "cascade" }),
    ...timestamps(),
  },
  (t) => ({
    fkRole: foreignKey({
      name: "party_roles_role_fk",
      columns: [t.roleId, t.roleScope],
      foreignColumns: [roles.id, roles.scope],
    }).onDelete("restrict"),
    fkRoleTenant: foreignKey({
      name: "party_roles_role_tenant_fk",
      columns: [t.roleId, t.tenantId],
      foreignColumns: [roles.id, roles.tenantId],
    }).onDelete("restrict"),
    uqTenantParty: uniqueIndex("uq_party_roles_tenant_party").on(t.tenantId, t.partyId),
    uqIdTenant: uniqueIndex("uq_party_roles_id_tenant").on(t.id, t.tenantId),
    uqPlatform: uniqueIndex("uq_party_roles_platform")
      .on(t.partyId)
      .where(sql`${t.roleScope} = 'platform'`),
    idxParty: index("idx_party_roles_party_id").on(t.partyId),
    chkPlatformGlobal: check(
      "party_roles_platform_global",
      sql`(${t.roleScope} = 'platform') = (${t.tenantId} is null)`,
    ),
  }),
);

// -----
// The one global Role, held by platform staff.
// Names the platform Master Role.
// -----
export const SUPERUSER_ROLE_KEY = "superuser";

export type TTenant =typeof tenants.$inferSelect;
export type TRole = typeof roles.$inferSelect;
export type TPartyRole = typeof partyRoles.$inferSelect;
