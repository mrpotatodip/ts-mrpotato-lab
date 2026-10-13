import { sql } from "drizzle-orm";
import { check, index, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { persons } from "./party";
import { tenants } from "./tenant";

// -----
// A code a superuser hands out so one person can
// sign up. Only the SHA-256 hash of the normalised
// code is stored; the code itself is shown once.
// -----
export const inviteCodes = pgTable(
  "invite_codes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    note: text("note").notNull().default(""),
    maxUses: integer("max_uses").notNull().default(1),
    useCount: integer("use_count").notNull().default(0),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    codeHash: text("code_hash").notNull().unique(),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => persons.partyId, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    idxCreatedAt: index("idx_invite_codes_created_at").on(t.createdAt),
    maxUsesPositive: check("invite_codes_max_uses_positive", sql`${t.maxUses} > 0`),
    useCountInRange: check(
      "invite_codes_use_count_in_range",
      sql`${t.useCount} >= 0 AND ${t.useCount} <= ${t.maxUses}`,
    ),
  }),
);

export type TInviteCode = typeof inviteCodes.$inferSelect;

// -----
// Who used a code, and the cafe it started.
// Written in the same transaction as the sign-up.
// -----
export const inviteCodeRedemptions = pgTable(
  "invite_code_redemptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    inviteCodeId: uuid("invite_code_id")
      .notNull()
      .references(() => inviteCodes.id, { onDelete: "restrict" }),
    personPartyId: uuid("person_party_id")
      .notNull()
      .references(() => persons.partyId, { onDelete: "restrict" }),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "restrict" }),
    redeemedAt: timestamp("redeemed_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    idxInviteCode: index("idx_invite_code_redemptions_invite_code").on(t.inviteCodeId),
  }),
);

export type TInviteCodeRedemption = typeof inviteCodeRedemptions.$inferSelect;
