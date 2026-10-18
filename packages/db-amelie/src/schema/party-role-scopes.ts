import { sql } from "drizzle-orm";
import { check, foreignKey, index, pgTable, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { tenantCountries } from "./country";
import { tenantLocations } from "./location";
import { partyRoles, tenants } from "./tenant";

// -----
// One Binding: a team member (a Party role) limited
// to one Country, which covers every Location in it
// including ones opened later, or to one Location.
// A member with no rows is whole-cafe. Exactly one
// of country_id and location_id is set. Composite
// foreign keys on tenant_id keep a row inside the
// member's own Tenant. A Country row and a Location
// row inside it may coexist; the form folds them.
// -----
export const partyRoleScopes = pgTable(
  "party_role_scopes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    partyRoleId: uuid("party_role_id").notNull(),
    countryId: uuid("country_id"),
    locationId: uuid("location_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    fkPartyRole: foreignKey({
      name: "party_role_scopes_party_role_tenant_fk",
      columns: [t.partyRoleId, t.tenantId],
      foreignColumns: [partyRoles.id, partyRoles.tenantId],
    }).onDelete("cascade"),
    fkCountry: foreignKey({
      name: "party_role_scopes_country_tenant_fk",
      columns: [t.countryId, t.tenantId],
      foreignColumns: [tenantCountries.id, tenantCountries.tenantId],
    }),
    fkLocation: foreignKey({
      name: "party_role_scopes_location_tenant_fk",
      columns: [t.locationId, t.tenantId],
      foreignColumns: [tenantLocations.id, tenantLocations.tenantId],
    }),
    chkExactlyOne: check(
      "party_role_scopes_exactly_one",
      sql`num_nonnulls(${t.countryId}, ${t.locationId}) = 1`,
    ),
    uqCountry: uniqueIndex("uq_party_role_scopes_country").on(t.partyRoleId, t.countryId),
    uqLocation: uniqueIndex("uq_party_role_scopes_location").on(t.partyRoleId, t.locationId),
    idxCountry: index("idx_party_role_scopes_country").on(t.countryId),
    idxLocation: index("idx_party_role_scopes_location").on(t.locationId),
  }),
);

export type TPartyRoleScope = typeof partyRoleScopes.$inferSelect;
