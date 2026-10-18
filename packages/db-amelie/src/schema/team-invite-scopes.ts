import { sql } from "drizzle-orm";
import { check, foreignKey, index, pgTable, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { tenantCountries } from "./country";
import { tenantLocations } from "./location";
import { teamInvites } from "./team-invites";
import { tenants } from "./tenant";

export const teamInviteScopes = pgTable(
  "team_invite_scopes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    inviteId: uuid("invite_id").notNull(),
    countryId: uuid("country_id"),
    locationId: uuid("location_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    fkInvite: foreignKey({
      name: "team_invite_scopes_invite_tenant_fk",
      columns: [t.inviteId, t.tenantId],
      foreignColumns: [teamInvites.id, teamInvites.tenantId],
    }).onDelete("cascade"),
    fkCountry: foreignKey({
      name: "team_invite_scopes_country_tenant_fk",
      columns: [t.countryId, t.tenantId],
      foreignColumns: [tenantCountries.id, tenantCountries.tenantId],
    }),
    fkLocation: foreignKey({
      name: "team_invite_scopes_location_tenant_fk",
      columns: [t.locationId, t.tenantId],
      foreignColumns: [tenantLocations.id, tenantLocations.tenantId],
    }),
    chkExactlyOne: check(
      "team_invite_scopes_exactly_one",
      sql`num_nonnulls(${t.countryId}, ${t.locationId}) = 1`,
    ),
    uqCountry: uniqueIndex("uq_team_invite_scopes_country").on(t.inviteId, t.countryId),
    uqLocation: uniqueIndex("uq_team_invite_scopes_location").on(t.inviteId, t.locationId),
    idxCountry: index("idx_team_invite_scopes_country").on(t.countryId),
    idxLocation: index("idx_team_invite_scopes_location").on(t.locationId),
  }),
);

export type TTeamInviteScope = typeof teamInviteScopes.$inferSelect;
