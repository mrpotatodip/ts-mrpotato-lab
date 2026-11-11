import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { partyPersons } from "./party";
import { tenants } from "./tenant";

// -----
// The Anthropic API key an Account brought, for its scans to use
// in place of the platform's. One row per Account: no row means
// the platform key. sealed_key is the key encrypted by the Worker
// (AES-GCM, with a secret that is not in this database), so a
// copy of this table alone cannot read it. last_four is what the
// dashboard shows.
// -----
export const tenantAnthropicKeys = pgTable("tenant_anthropic_keys", {
  tenantId: uuid("tenant_id")
    .primaryKey()
    .references(() => tenants.id, { onDelete: "cascade" }),
  sealedKey: text("sealed_key").notNull(),
  lastFour: text("last_four").notNull(),
  updatedBy: uuid("updated_by")
    .notNull()
    .references(() => partyPersons.partyId, { onDelete: "restrict" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export type TTenantAnthropicKey = typeof tenantAnthropicKeys.$inferSelect;
