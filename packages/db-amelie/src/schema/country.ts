import { sql } from "drizzle-orm";
import { check, index, pgTable, text, timestamp, unique, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { tenants } from "./tenant";

// -----
// One country a Tenant sells in, with its Currency.
// Archived, never deleted. (id, tenant_id) is unique
// so Locations, prices, FAQs and Thread sessions can
// only point at their own Tenant's Country. One row
// per country code per Tenant, archived included.
// -----
export const tenantCountries = pgTable(
  "tenant_countries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    country: text("country").notNull(),
    currency: text("currency").notNull(),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => ({
    countryFormat: check("tenant_countries_country_format", sql`${t.country} ~ '^[A-Z]{2}$'`),
    currencyFormat: check("tenant_countries_currency_format", sql`${t.currency} ~ '^[A-Z]{3}$'`),
    uqIdTenant: unique("uq_tenant_countries_id_tenant").on(t.id, t.tenantId),
    uqTenantCountry: uniqueIndex("uq_tenant_countries_tenant_country").on(t.tenantId, t.country),
    idxTenant: index("idx_tenant_countries_tenant").on(t.tenantId),
  }),
);

export type TTenantCountry = typeof tenantCountries.$inferSelect;
