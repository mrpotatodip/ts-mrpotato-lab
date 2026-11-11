import { index, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { partyPersons } from "./party";
import { tenants } from "./tenant";

// -----
// A Runner: a computer that an Account's admin paired to run
// Scans, in place of the Container. A row starts as a pairing
// code: pairing_code_hash and pairing_expires_at are set and
// token_hash is empty. Pairing is one UPDATE that clears the
// code and sets token_hash, so a code works once. Only hashes
// are stored, so a copy of this table can neither pair nor act
// as a Runner. revoked_at stops a Runner at once.
// -----
export const tenantRunners = pgTable(
  "tenant_runners",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    pairingCodeHash: text("pairing_code_hash"),
    pairingExpiresAt: timestamp("pairing_expires_at", { withTimezone: true }),
    tokenHash: text("token_hash"),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => partyPersons.partyId, { onDelete: "restrict" }),
    pairedAt: timestamp("paired_at", { withTimezone: true }),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => ({
    uqPairingCodeHash: uniqueIndex("uq_tenant_runners_pairing_code_hash").on(t.pairingCodeHash),
    uqTokenHash: uniqueIndex("uq_tenant_runners_token_hash").on(t.tokenHash),
    idxTenant: index("idx_tenant_runners_tenant_id").on(t.tenantId),
  }),
);

export type TTenantRunner = typeof tenantRunners.$inferSelect;
