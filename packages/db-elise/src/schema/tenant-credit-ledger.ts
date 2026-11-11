import { sql } from "drizzle-orm";
import { check, index, numeric, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { CREDIT_ENTRY_KIND_VALUES, type CreditEntryKindValue } from "@repo/contracts/elise";
import { scans } from "./scans";
import { tenants } from "./tenant";

const inList = (values: readonly string[]) => sql.raw(values.map((value) => `'${value}'`).join(", "));

// -----
// An Account's credit balance is the sum of its rows here: one
// append-only list, never updated. amount_usd is signed, in credit
// dollars (a scan's cost times the plan's markup). A grant or a topup
// carries the Stripe ID that paid for it in idempotency_key, so a
// repeated webhook adds nothing. A topup is positive; a grant may be
// zero, the record of a renewal the carry cap left nothing to add
// to, so that a repeated webhook cannot add it later. A running scan
// has one scan_hold (negative), and its end adds one scan_settle
// (the hold given back, minus the real charge). The balance counts
// holds, so credit a running scan may spend is already out of reach.
// -----
export const tenantCreditLedger = pgTable(
  "tenant_credit_ledger",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    kind: text("kind").$type<CreditEntryKindValue>().notNull(),
    amountUsd: numeric("amount_usd", { precision: 12, scale: 4 }).notNull(),
    scanId: text("scan_id").references(() => scans.id, { onDelete: "restrict" }),
    idempotencyKey: text("idempotency_key"),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    idxTenantCreated: index("idx_tenant_credit_ledger_tenant_created").on(t.tenantId, t.createdAt),
    uqScanEntry: uniqueIndex("uq_tenant_credit_ledger_scan_entry")
      .on(t.scanId, t.kind)
      .where(sql`${t.scanId} is not null`),
    uqIdempotencyKey: uniqueIndex("uq_tenant_credit_ledger_idempotency_key")
      .on(t.tenantId, t.idempotencyKey)
      .where(sql`${t.idempotencyKey} is not null`),
    chkKind: check("tenant_credit_ledger_kind", sql`${t.kind} in (${inList(CREDIT_ENTRY_KIND_VALUES)})`),
    chkScanKinds: check(
      "tenant_credit_ledger_scan_kinds",
      sql`(${t.kind} in ('scan_hold', 'scan_settle')) = (${t.scanId} is not null)`,
    ),
    chkSign: check(
      "tenant_credit_ledger_sign",
      sql`(${t.kind} = 'grant' and ${t.amountUsd} >= 0) or (${t.kind} = 'topup' and ${t.amountUsd} > 0) or (${t.kind} in ('scan_hold', 'expiry') and ${t.amountUsd} < 0) or ${t.kind} in ('scan_settle', 'adjustment')`,
    ),
  }),
);

export type TTenantCreditLedgerEntry = typeof tenantCreditLedger.$inferSelect;
