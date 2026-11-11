import { z } from "zod";
import { CREDIT_ENTRY_KIND_VALUES, SCAN_KEY_SOURCE_VALUES, SUBSCRIPTION_SOURCE_VALUES, SUBSCRIPTION_STATUS_VALUES } from "../enums";

// -----
// GET /usage/credit: the credit an account may spend on scans now,
// with the plan that grants it. balanceUsd already has the holds of
// running scans taken out. keySource is the key the plan's scans use:
// "platform" scans take credit, "account" scans run on the account's
// own Anthropic key and take none. Every field is null or zero for an
// account with no plan. scanAllowance is the most scans a UTC month
// allows, null for no limit; scans is how many the month has so far.
// -----
export const CreditBalanceSchema = z.object({
  planKey: z.string().nullable(),
  keySource: z.enum(["platform", "account"]).nullable(),
  balanceUsd: z.number(),
  monthlyCreditUsd: z.number().min(0),
  scans: z.number().int().min(0),
  scanAllowance: z.number().int().min(1).nullable(),
});

export type CreditBalance = z.infer<typeof CreditBalanceSchema>;

// -----
// GET /usage/plan: the account's plan and subscription, for the
// Plan page. plan is null for an account with none, and then status,
// source and currentPeriodEnd are null too. source "grant" is a plan
// we gave, with no Stripe behind it. carryCapUsd is the balance a
// month's credit may not push past, null when the plan grants none.
// seats counts the people in the account and the invites still
// waiting, the same count the invite limit uses. Stripe IDs and the
// plan's markup stay out on purpose.
// -----
export const PlanDetailsSchema = z.object({
  plan: z
    .object({
      key: z.string(),
      label: z.string(),
      monthlyPriceUsd: z.number().min(0),
      includedCreditUsd: z.number().min(0),
      carryCapUsd: z.number().min(0).nullable(),
      keySource: z.enum(SCAN_KEY_SOURCE_VALUES),
      scanAllowance: z.number().int().min(1).nullable(),
      maxMembers: z.number().int().min(1),
    })
    .nullable(),
  status: z.enum(SUBSCRIPTION_STATUS_VALUES).nullable(),
  source: z.enum(SUBSCRIPTION_SOURCE_VALUES).nullable(),
  currentPeriodEnd: z.string().nullable(),
  scans: z.number().int().min(0),
  seats: z.object({ members: z.number().int().min(0), pendingInvites: z.number().int().min(0) }),
});

export type PlanDetails = z.infer<typeof PlanDetailsSchema>;

// -----
// GET /usage/credit/entries: the account's credit history, newest
// first. amountUsd is signed: credit added is positive, credit a scan
// took is negative. A scan shows as one entry, its real charge; a
// scan still running shows its hold, until it ends. cursor is the
// nextCursor of the page before; nextCursor is null on the last page.
// -----
export const CreditEntriesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(10),
  cursor: z.uuid().optional(),
});

export const CreditEntrySchema = z.object({
  id: z.string(),
  kind: z.enum(CREDIT_ENTRY_KIND_VALUES),
  amountUsd: z.number(),
  scanId: z.string().nullable(),
  note: z.string().nullable(),
  createdAt: z.string(),
});

export const CreditEntriesSchema = z.object({
  entries: z.array(CreditEntrySchema),
  nextCursor: z.string().nullable(),
});

export type CreditEntriesQuery = z.infer<typeof CreditEntriesQuerySchema>;
export type CreditEntry = z.infer<typeof CreditEntrySchema>;
export type CreditEntries = z.infer<typeof CreditEntriesSchema>;
