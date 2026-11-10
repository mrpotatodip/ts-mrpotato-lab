import { sql } from "drizzle-orm";
import { boolean, check, integer, numeric, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

// -----
// What each plan gives: the platform's catalogue, one row per plan.
// The prices here are for display; Stripe charges by stripe_price_id.
// included_credit_usd is the most the platform's key may spend for
// the Account in a UTC calendar month. max_members is how many people
// the Account may hold. Change a price, a credit or a cap by updating
// the row, with no deploy.
// -----
export const platformMasterPlans = pgTable(
  "platform_master_plans",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    key: text("key").notNull(),
    label: text("label").notNull(),
    monthlyPriceUsd: numeric("monthly_price_usd", { precision: 10, scale: 2 }).notNull(),
    includedCreditUsd: numeric("included_credit_usd", { precision: 10, scale: 2 }).notNull(),
    maxMembers: integer("max_members").notNull(),
    stripePriceId: text("stripe_price_id"),
    enabled: boolean("enabled").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => ({
    uqKey: uniqueIndex("uq_platform_master_plans_key").on(t.key),
    chkMonthlyPrice: check("platform_master_plans_monthly_price", sql`${t.monthlyPriceUsd} >= 0`),
    chkIncludedCredit: check("platform_master_plans_included_credit", sql`${t.includedCreditUsd} >= 0`),
    chkMaxMembers: check("platform_master_plans_max_members", sql`${t.maxMembers} >= 1`),
  }),
);

export type TPlatformMasterPlan = typeof platformMasterPlans.$inferSelect;
