import { foreignKey, index, pgTable, text, timestamp, unique, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { tenantCountries } from "./country";
import { tenants } from "./tenant";

// -----
// One physical place a Tenant operates from.
// Every Tenant keeps at least one active
// Location; they are archived, never deleted.
// country_id is the Country it sits in, fixed at
// creation.
// (id, tenant_id) is unique so rows in other
// tables can only point at their own Tenant's
// Location. slug is unique per Tenant.
// -----
export const tenantLocations = pgTable(
  "tenant_locations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    address: text("address"),
    phone: text("phone"),
    timezone: text("timezone").notNull(),
    countryId: uuid("country_id").notNull(),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => ({
    uqIdTenant: unique("uq_tenant_locations_id_tenant").on(t.id, t.tenantId),
    uqTenantSlug: uniqueIndex("uq_tenant_locations_tenant_slug").on(t.tenantId, t.slug),
    countryInTenant: foreignKey({
      name: "tenant_locations_country_in_tenant_fk",
      columns: [t.countryId, t.tenantId],
      foreignColumns: [tenantCountries.id, tenantCountries.tenantId],
    }),
    idxTenant: index("idx_tenant_locations_tenant").on(t.tenantId),
    idxCountry: index("idx_tenant_locations_country").on(t.countryId),
  }),
);

export type TTenantLocation = typeof tenantLocations.$inferSelect;
