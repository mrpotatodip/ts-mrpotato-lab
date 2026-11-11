import { z } from "zod";

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
