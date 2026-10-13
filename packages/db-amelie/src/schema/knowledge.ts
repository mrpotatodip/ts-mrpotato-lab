import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  foreignKey,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  smallint,
  text,
  time,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { tenantCountries } from "./country";
import { tenantLocations } from "./location";
import { tenants } from "./tenant";

const timestamps = () => ({
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

const tenantId = () =>
  uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" });

type MenuItemVariant = { name: string; price: string };

// -----
// Tenant-wide contact facts only; address and
// phone belong to a Location. Free-form topics
// are FAQs.
// -----
export const tenantBusinessProfiles = pgTable(
  "tenant_business_profiles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: tenantId(),
    description: text("description"),
    websiteUrl: text("website_url"),
    email: text("email"),
    ...timestamps(),
  },
  (t) => ({
    uqTenant: uniqueIndex("uq_tenant_business_profiles_tenant").on(t.tenantId),
  }),
);

// -----
// day_of_week: 0 = Sunday. A closed day
// has no times; an open day needs both.
// One row per Location and weekday.
// -----
export const tenantBusinessHours = pgTable(
  "tenant_business_hours",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: tenantId(),
    locationId: uuid("location_id").notNull(),
    dayOfWeek: smallint("day_of_week").notNull(),
    opensAt: time("opens_at"),
    closesAt: time("closes_at"),
    isClosed: boolean("is_closed").notNull().default(false),
    ...timestamps(),
  },
  (t) => ({
    uqLocationDay: uniqueIndex("uq_tenant_business_hours_location_day").on(t.locationId, t.dayOfWeek),
    locationInTenant: foreignKey({
      name: "tenant_business_hours_location_in_tenant_fk",
      columns: [t.locationId, t.tenantId],
      foreignColumns: [tenantLocations.id, tenantLocations.tenantId],
    }).onDelete("cascade"),
    dayRange: check("tenant_business_hours_day_range", sql`${t.dayOfWeek} BETWEEN 0 AND 6`),
    timesShape: check(
      "tenant_business_hours_times_shape",
      sql`${t.isClosed} OR (${t.opensAt} IS NOT NULL AND ${t.closesAt} IS NOT NULL)`,
    ),
  }),
);

export const tenantBusinessHoursOverrides = pgTable(
  "tenant_business_hours_overrides",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: tenantId(),
    locationId: uuid("location_id").notNull(),
    date: date("date").notNull(),
    opensAt: time("opens_at"),
    closesAt: time("closes_at"),
    isClosed: boolean("is_closed").notNull().default(false),
    note: text("note"),
    ...timestamps(),
  },
  (t) => ({
    uqLocationDate: uniqueIndex("uq_tenant_business_hours_overrides_location_date").on(t.locationId, t.date),
    locationInTenant: foreignKey({
      name: "tenant_business_hours_overrides_location_in_tenant_fk",
      columns: [t.locationId, t.tenantId],
      foreignColumns: [tenantLocations.id, tenantLocations.tenantId],
    }).onDelete("cascade"),
    timesShape: check(
      "tenant_business_hours_overrides_times_shape",
      sql`${t.isClosed} OR (${t.opensAt} IS NOT NULL AND ${t.closesAt} IS NOT NULL)`,
    ),
  }),
);

// -----
// (id, tenant_id) is unique so items can
// only point at their own Tenant's category.
// -----
export const tenantMenuCategories = pgTable(
  "tenant_menu_categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: tenantId(),
    name: text("name").notNull(),
    note: text("note"),
    sortOrder: integer("sort_order").notNull().default(0),
    ...timestamps(),
  },
  (t) => ({
    uqIdTenant: unique("uq_tenant_menu_categories_id_tenant").on(t.id, t.tenantId),
    idxTenant: index("idx_tenant_menu_categories_tenant").on(t.tenantId),
  }),
);

// -----
// Prices live in menu_item_prices, one per Country;
// the composite FK keeps Tenants apart.
// -----
export const tenantMenuItems = pgTable(
  "tenant_menu_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: tenantId(),
    categoryId: uuid("category_id").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    isAvailable: boolean("is_available").notNull().default(true),
    availableAtAllLocations: boolean("available_at_all_locations").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    ...timestamps(),
  },
  (t) => ({
    categoryInTenant: foreignKey({
      name: "tenant_menu_items_category_in_tenant_fk",
      columns: [t.categoryId, t.tenantId],
      foreignColumns: [tenantMenuCategories.id, tenantMenuCategories.tenantId],
    }).onDelete("cascade"),
    uqIdTenant: unique("uq_tenant_menu_items_id_tenant").on(t.id, t.tenantId),
    idxTenant: index("idx_tenant_menu_items_tenant").on(t.tenantId),
  }),
);

// -----
// Photos of a Menu item, in order; the first is
// the card. object_key is the R2 object, not a URL.
// -----
export const tenantMenuItemImages = pgTable(
  "tenant_menu_item_images",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: tenantId(),
    menuItemId: uuid("menu_item_id").notNull(),
    objectKey: text("object_key").notNull(),
    name: text("name").notNull(),
    contentType: text("content_type").notNull(),
    size: integer("size").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    ...timestamps(),
  },
  (t) => ({
    itemInTenant: foreignKey({
      name: "tenant_menu_item_images_item_in_tenant_fk",
      columns: [t.menuItemId, t.tenantId],
      foreignColumns: [tenantMenuItems.id, tenantMenuItems.tenantId],
    }).onDelete("cascade"),
    uqIdTenant: unique("uq_tenant_menu_item_images_id_tenant").on(t.id, t.tenantId),
    uqItemSort: unique("uq_tenant_menu_item_images_item_sort").on(t.menuItemId, t.sortOrder),
    uqObjectKey: unique("uq_tenant_menu_item_images_object_key").on(t.objectKey),
    idxTenant: index("idx_tenant_menu_item_images_tenant").on(t.tenantId),
    idxItem: index("idx_tenant_menu_item_images_item").on(t.menuItemId),
  }),
);

// -----
// Where an item is sold when it is not sold at
// every Location. is_available = false on a row
// of an all-Locations item means sold out there.
// Composite FKs keep item and Location in one Tenant.
// -----
export const tenantMenuItemLocations = pgTable(
  "tenant_menu_item_locations",
  {
    tenantId: tenantId(),
    menuItemId: uuid("menu_item_id").notNull(),
    locationId: uuid("location_id").notNull(),
    isAvailable: boolean("is_available").notNull(),
    ...timestamps(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.menuItemId, t.locationId] }),
    itemInTenant: foreignKey({
      name: "tenant_menu_item_locations_item_in_tenant_fk",
      columns: [t.menuItemId, t.tenantId],
      foreignColumns: [tenantMenuItems.id, tenantMenuItems.tenantId],
    }).onDelete("cascade"),
    locationInTenant: foreignKey({
      name: "tenant_menu_item_locations_location_in_tenant_fk",
      columns: [t.locationId, t.tenantId],
      foreignColumns: [tenantLocations.id, tenantLocations.tenantId],
    }).onDelete("cascade"),
    idxTenant: index("idx_tenant_menu_item_locations_tenant").on(t.tenantId),
    idxLocation: index("idx_tenant_menu_item_locations_location").on(t.locationId),
  }),
);

// -----
// What an item costs in one Country, in its Currency;
// price is the lowest Variant when there are Variants.
// is_sold = false stops selling it there and keeps the
// price. Composite FKs keep item and Country in one Tenant.
// -----
export const menuItemPrices = pgTable(
  "menu_item_prices",
  {
    tenantId: tenantId(),
    menuItemId: uuid("menu_item_id").notNull(),
    countryId: uuid("country_id").notNull(),
    price: numeric("price", { precision: 10, scale: 2 }).notNull(),
    variants: jsonb("variants").$type<MenuItemVariant[]>(),
    isSold: boolean("is_sold").notNull().default(true),
    ...timestamps(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.menuItemId, t.countryId] }),
    itemInTenant: foreignKey({
      name: "menu_item_prices_item_in_tenant_fk",
      columns: [t.menuItemId, t.tenantId],
      foreignColumns: [tenantMenuItems.id, tenantMenuItems.tenantId],
    }).onDelete("cascade"),
    countryInTenant: foreignKey({
      name: "menu_item_prices_country_in_tenant_fk",
      columns: [t.countryId, t.tenantId],
      foreignColumns: [tenantCountries.id, tenantCountries.tenantId],
    }).onDelete("cascade"),
    idxTenant: index("idx_menu_item_prices_tenant").on(t.tenantId),
    idxCountry: index("idx_menu_item_prices_country").on(t.countryId),
  }),
);

// -----
// Shared reference list: the only knowledge
// table with no tenant_id.
// -----
export const dietaryTags = pgTable(
  "dietary_tags",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull(),
    label: text("label").notNull(),
    ...timestamps(),
  },
  (t) => ({
    uqSlug: uniqueIndex("uq_dietary_tags_slug").on(t.slug),
  }),
);

export const tenantMenuItemDietaryTags = pgTable(
  "tenant_menu_item_dietary_tags",
  {
    tenantId: tenantId(),
    menuItemId: uuid("menu_item_id").notNull(),
    dietaryTagId: uuid("dietary_tag_id")
      .notNull()
      .references(() => dietaryTags.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.menuItemId, t.dietaryTagId] }),
    itemInTenant: foreignKey({
      name: "tenant_menu_item_dietary_tags_item_in_tenant_fk",
      columns: [t.menuItemId, t.tenantId],
      foreignColumns: [tenantMenuItems.id, tenantMenuItems.tenantId],
    }).onDelete("cascade"),
    idxTenant: index("idx_tenant_menu_item_dietary_tags_tenant").on(t.tenantId),
  }),
);

// -----
// A Tenant's own FAQ groups, e.g. "Parking"
// or "Kids & family"; (id, tenant_id) is unique.
// -----
export const tenantFaqCategories = pgTable(
  "tenant_faq_categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: tenantId(),
    name: text("name").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    ...timestamps(),
  },
  (t) => ({
    uqIdTenant: unique("uq_tenant_faq_categories_id_tenant").on(t.id, t.tenantId),
    idxTenant: index("idx_tenant_faq_categories_tenant").on(t.tenantId),
  }),
);

// -----
// No category means "General". Migration 0010
// nulls only category_id on category delete.
// Neither location_id nor country_id means every
// Location; at most one of the two is set.
// -----
export const tenantFaqs = pgTable(
  "tenant_faqs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: tenantId(),
    categoryId: uuid("category_id"),
    locationId: uuid("location_id"),
    countryId: uuid("country_id"),
    question: text("question").notNull(),
    answer: text("answer").notNull(),
    ...timestamps(),
  },
  (t) => ({
    categoryInTenant: foreignKey({
      name: "tenant_faqs_category_in_tenant_fk",
      columns: [t.categoryId, t.tenantId],
      foreignColumns: [tenantFaqCategories.id, tenantFaqCategories.tenantId],
    }).onDelete("set null"),
    locationInTenant: foreignKey({
      name: "tenant_faqs_location_in_tenant_fk",
      columns: [t.locationId, t.tenantId],
      foreignColumns: [tenantLocations.id, tenantLocations.tenantId],
    }).onDelete("cascade"),
    countryInTenant: foreignKey({
      name: "tenant_faqs_country_in_tenant_fk",
      columns: [t.countryId, t.tenantId],
      foreignColumns: [tenantCountries.id, tenantCountries.tenantId],
    }).onDelete("cascade"),
    countryOrLocation: check("tenant_faqs_country_or_location", sql`${t.countryId} is null or ${t.locationId} is null`),
    idxTenant: index("idx_tenant_faqs_tenant").on(t.tenantId),
  }),
);

export type TTenantBusinessProfile = typeof tenantBusinessProfiles.$inferSelect;
export type TTenantBusinessHours = typeof tenantBusinessHours.$inferSelect;
export type TTenantBusinessHoursOverride = typeof tenantBusinessHoursOverrides.$inferSelect;
export type TTenantMenuCategory = typeof tenantMenuCategories.$inferSelect;
export type TTenantMenuItem = typeof tenantMenuItems.$inferSelect;
export type TMenuItemPrice = typeof menuItemPrices.$inferSelect;
export type TTenantMenuItemLocation = typeof tenantMenuItemLocations.$inferSelect;
export type TDietaryTag = typeof dietaryTags.$inferSelect;
export type TTenantFaqCategory = typeof tenantFaqCategories.$inferSelect;
export type TTenantFaq = typeof tenantFaqs.$inferSelect;
