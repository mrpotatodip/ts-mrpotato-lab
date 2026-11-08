import { z } from "zod";
import { SeverityCountsSchema } from "../scan/dto";

export const VERDICT_VALUES = ["pass", "fail", "cannot_tell"] as const;

// -----
// Why a verdict is not a pass. The first four make it
// cannot_tell (the scans cannot be trusted yet). over_limit
// makes it fail when the scans can be trusted, and is listed
// beside the others when they cannot.
// -----
export const VERDICT_REASON_VALUES = ["not_scanned", "too_few_scans", "unchecked_priors", "too_many_priors", "over_limit"] as const;

export const VerdictQuerySchema = z.object({
  commit: z
    .string()
    .regex(/^[0-9a-fA-F]{40}$/)
    .transform((sha) => sha.toLowerCase()),
});

export const VerdictFindingSchema = z.object({
  fingerprint: z.string(),
  title: z.string(),
  severity: z.enum(["critical", "high", "medium", "low", "informational"]).nullable(),
  class: z.string(),
  file: z.string().nullable(),
  line: z.number().int().nullable(),
});

export const VerdictAcceptedSchema = VerdictFindingSchema.extend({
  note: z.string(),
  acceptedUntil: z.string(),
});

export const VerdictOpenSchema = VerdictFindingSchema.extend({
  // Set when a person accepted this risk and the time ran out.
  acceptanceExpiredAt: z.string().nullable(),
});

export const VerdictSchema = z.object({
  verdict: z.enum(VERDICT_VALUES),
  commit: z.string(),
  reasons: z.array(z.object({ code: z.enum(VERDICT_REASON_VALUES), message: z.string() })),
  scans: z.object({ required: z.number().int(), counted: z.number().int(), ids: z.array(z.string()) }),
  limits: z.object({ critical: z.number().int(), high: z.number().int(), medium: z.number().int() }),
  counts: SeverityCountsSchema.extend({ needsValidation: z.number().int().min(0) }),
  open: z.array(VerdictOpenSchema),
  accepted: z.array(VerdictAcceptedSchema),
  dismissed: z.array(VerdictFindingSchema),
});

export type VerdictValue = (typeof VERDICT_VALUES)[number];
export type VerdictReasonCode = (typeof VERDICT_REASON_VALUES)[number];
export type VerdictQuery = z.infer<typeof VerdictQuerySchema>;
export type VerdictFinding = z.infer<typeof VerdictFindingSchema>;
export type Verdict = z.infer<typeof VerdictSchema>;
