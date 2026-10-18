import { sql } from "drizzle-orm";
import { foreignKey, index, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { persons } from "./party";
import { roles, tenants } from "./tenant";

export const teamInvites = pgTable(
  "team_invites",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    roleId: uuid("role_id").notNull(),
    tokenHash: text("token_hash").notNull(),
    invitedBy: uuid("invited_by")
      .notNull()
      .references(() => persons.partyId, { onDelete: "restrict" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => ({
    uqTokenHash: uniqueIndex("uq_team_invites_token_hash").on(t.tokenHash),
    uqPendingEmail: uniqueIndex("uq_team_invites_pending_email")
      .on(t.tenantId, t.email)
      .where(sql`${t.revokedAt} is null and ${t.acceptedAt} is null`),
    fkRoleTenant: foreignKey({
      name: "team_invites_role_tenant_fk",
      columns: [t.roleId, t.tenantId],
      foreignColumns: [roles.id, roles.tenantId],
    }).onDelete("restrict"),
    uqIdTenant: uniqueIndex("uq_team_invites_id_tenant").on(t.id, t.tenantId),
    idxTenant: index("idx_team_invites_tenant_id").on(t.tenantId),
  }),
);

export type TTeamInvite = typeof teamInvites.$inferSelect;
