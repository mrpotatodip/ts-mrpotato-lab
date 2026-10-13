import { pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

const timestamps = () => ({
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

// -----
// Twin of PARTY_TYPE_VALUES in
// @repo/contracts/amelie; change both.
// -----
export const partyTypeEnum = pgEnum("party_type", ["person", "organization"]);

// -----
// Any actor: a Person or an Organization.
// Party answers "who is this?".
// -----
export const parties = pgTable("parties", {
  id: uuid("id").primaryKey().defaultRandom(),
  type: partyTypeEnum("type").notNull(),
  ...timestamps(),
});

export const persons = pgTable("persons", {
  partyId: uuid("party_id")
    .primaryKey()
    .references(() => parties.id, { onDelete: "cascade" }),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  ...timestamps(),
});

export const organizations = pgTable("organizations", {
  partyId: uuid("party_id")
    .primaryKey()
    .references(() => parties.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  ...timestamps(),
});

export type TParty = typeof parties.$inferSelect;
export type TPerson = typeof persons.$inferSelect;
export type TOrganization = typeof organizations.$inferSelect;
