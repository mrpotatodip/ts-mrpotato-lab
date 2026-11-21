import { sql } from "drizzle-orm";
import { check, foreignKey, index, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { INVITE_EMAIL_STATUS_VALUES, type InviteEmailStatusValue } from "@repo/contracts/elise";
import { partyPersons } from "./party";
import { partyMasterRoles, tenants } from "./tenant";

const inList = (values: readonly string[]) => sql.raw(values.map((value) => `'${value}'`).join(", "));

export const tenantTeamInvites = pgTable(
  "tenant_team_invites",
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
      .references(() => partyPersons.partyId, { onDelete: "restrict" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    emailStatus: text("email_status").$type<InviteEmailStatusValue>().notNull().default("not_sent"),
    emailStatusAt: timestamp("email_status_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => ({
    uqTokenHash: uniqueIndex("uq_tenant_team_invites_token_hash").on(t.tokenHash),
    uqPendingEmail: uniqueIndex("uq_tenant_team_invites_pending_email")
      .on(t.tenantId, t.email)
      .where(sql`${t.revokedAt} is null and ${t.acceptedAt} is null`),
    fkRoleTenant: foreignKey({
      name: "tenant_team_invites_role_tenant_fk",
      columns: [t.roleId, t.tenantId],
      foreignColumns: [partyMasterRoles.id, partyMasterRoles.tenantId],
    }).onDelete("restrict"),
    chkEmailStatus: check("tenant_team_invites_email_status", sql`${t.emailStatus} in (${inList(INVITE_EMAIL_STATUS_VALUES)})`),
    uqIdTenant: uniqueIndex("uq_tenant_team_invites_id_tenant").on(t.id, t.tenantId),
    idxTenant: index("idx_tenant_team_invites_tenant_id").on(t.tenantId),
  }),
);

export type TTenantTeamInvite = typeof tenantTeamInvites.$inferSelect;
