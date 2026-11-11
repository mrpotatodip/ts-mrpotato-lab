import { sql } from "drizzle-orm";
import { boolean, check, integer, numeric, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { SCAN_KEY_SOURCE_VALUES, type ScanKeySourceValue } from "@repo/contracts/elise";

const inList = (values: readonly string[]) => sql.raw(values.map((value) => `'${value}'`).join(", "));

// -----
// What each plan gives: the platform's catalogue, one row per plan.
// The prices here are for display; Stripe charges by stripe_price_id.
// included_credit_usd is the credit a paid period adds to the
// Account's balance (see tenant_credit_ledger). credit_markup is what
// a scan's cost is multiplied by to get the credit it takes.
// carry_cap_usd is the balance a period's grant may not push past;
// null means the plan grants no credit. key_source is the key the
// plan's scans use: platform (they take credit) or account (the
// Account's own Anthropic key, no credit). monthly_scan_allowance is
// the most scans a UTC month allows, null for no limit. max_members
// is how many people the Account may hold. Change a price, a credit
// or a cap by updating the row, with no deploy.
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
    creditMarkup: numeric("credit_markup", { precision: 6, scale: 3 }).notNull().default("1.5"),
    carryCapUsd: numeric("carry_cap_usd", { precision: 10, scale: 2 }),
    keySource: text("key_source").$type<ScanKeySourceValue>().notNull().default("platform"),
    monthlyScanAllowance: integer("monthly_scan_allowance"),
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
    chkCreditMarkup: check("platform_master_plans_credit_markup", sql`${t.creditMarkup} >= 1`),
    chkCarryCap: check("platform_master_plans_carry_cap", sql`${t.carryCapUsd} is null or ${t.carryCapUsd} >= ${t.includedCreditUsd}`),
    chkKeySource: check("platform_master_plans_key_source", sql`${t.keySource} in (${inList(SCAN_KEY_SOURCE_VALUES)})`),
    chkScanAllowance: check("platform_master_plans_scan_allowance", sql`${t.monthlyScanAllowance} is null or ${t.monthlyScanAllowance} >= 1`),
  }),
);

export type TPlatformMasterPlan = typeof platformMasterPlans.$inferSelect;
