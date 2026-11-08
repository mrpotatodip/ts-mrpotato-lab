import { sql } from "drizzle-orm";
import { foreignKey, index, pgTable, primaryKey, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { tenantTeamInvites } from "./tenant-team-invites";
import { partyRoles, tenants } from "./tenant";

// -----
// A Group is a named set of a Tenant's people,
// for example "Backend". It grants nothing yet:
// Powers still come from a person's Role. Names
// are unique within a Tenant, ignoring case.
// -----
export const tenantGroups = pgTable(
  "tenant_groups",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => ({
    uqTenantName: uniqueIndex("uq_tenant_groups_tenant_name").on(t.tenantId, sql`lower(${t.name})`),
    uqIdTenant: uniqueIndex("uq_tenant_groups_id_tenant").on(t.id, t.tenantId),
  }),
);

// -----
// Both keys carry the Tenant, so a Group never
// holds someone from another Tenant. Losing the
// Role in the Tenant drops the person from its
// Groups.
// -----
export const tenantGroupMembers = pgTable(
  "tenant_group_members",
  {
    groupId: uuid("group_id").notNull(),
    tenantId: uuid("tenant_id").notNull(),
    partyId: uuid("party_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    pk: primaryKey({ name: "tenant_group_members_pkey", columns: [t.groupId, t.partyId] }),
    fkGroup: foreignKey({
      name: "tenant_group_members_group_tenant_fk",
      columns: [t.groupId, t.tenantId],
      foreignColumns: [tenantGroups.id, tenantGroups.tenantId],
    }).onDelete("cascade"),
    fkRole: foreignKey({
      name: "tenant_group_members_party_tenant_fk",
      columns: [t.tenantId, t.partyId],
      foreignColumns: [partyRoles.tenantId, partyRoles.partyId],
    }).onDelete("cascade"),
    idxParty: index("idx_tenant_group_members_party_id").on(t.partyId),
  }),
);

// -----
// The Groups an invite puts the person in once
// it is accepted.
// -----
export const tenantTeamInviteGroups = pgTable(
  "tenant_team_invite_groups",
  {
    inviteId: uuid("invite_id").notNull(),
    groupId: uuid("group_id").notNull(),
    tenantId: uuid("tenant_id").notNull(),
  },
  (t) => ({
    pk: primaryKey({ name: "tenant_team_invite_groups_pkey", columns: [t.inviteId, t.groupId] }),
    fkInvite: foreignKey({
      name: "tenant_team_invite_groups_invite_tenant_fk",
      columns: [t.inviteId, t.tenantId],
      foreignColumns: [tenantTeamInvites.id, tenantTeamInvites.tenantId],
    }).onDelete("cascade"),
    fkGroup: foreignKey({
      name: "tenant_team_invite_groups_group_tenant_fk",
      columns: [t.groupId, t.tenantId],
      foreignColumns: [tenantGroups.id, tenantGroups.tenantId],
    }).onDelete("cascade"),
  }),
);

export type TTenantGroup = typeof tenantGroups.$inferSelect;
export type TTenantGroupMember = typeof tenantGroupMembers.$inferSelect;
