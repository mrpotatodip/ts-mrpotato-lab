import { boolean, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

const timestamps = () => ({
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

// -----
// The platform catalogue of Party types. The
// system rows are person and organization (keys
// in PARTY_TYPE_VALUES in @repo/contracts/elise);
// a new type is a new row, not a migration.
// A trigger blocks deleting a system row or
// changing its key.
// -----
export const partyMasterTypes = pgTable(
  "party_master_types",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    key: text("key").notNull(),
    label: text("label").notNull(),
    description: text("description"),
    isSystem: boolean("is_system").notNull().default(false),
    ...timestamps(),
  },
  (t) => ({
    uqKey: uniqueIndex("uq_party_master_types_key").on(t.key),
  }),
);

// -----
// Any actor: a Person or an Organization.
// Party answers "who is this?".
// -----
export const parties = pgTable("parties", {
  id: uuid("id").primaryKey().defaultRandom(),
  masterTypeId: uuid("master_type_id")
    .notNull()
    .references(() => partyMasterTypes.id, { onDelete: "restrict" }),
  ...timestamps(),
});

export const partyPersons = pgTable("party_persons", {
  partyId: uuid("party_id")
    .primaryKey()
    .references(() => parties.id, { onDelete: "cascade" }),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  ...timestamps(),
});

export const partyOrganizations = pgTable("party_organizations", {
  partyId: uuid("party_id")
    .primaryKey()
    .references(() => parties.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  ...timestamps(),
});

export type TPartyMasterType = typeof partyMasterTypes.$inferSelect;
export type TParty = typeof parties.$inferSelect;
export type TPartyPerson = typeof partyPersons.$inferSelect;
export type TPartyOrganization = typeof partyOrganizations.$inferSelect;
