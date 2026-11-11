import { z } from "zod";
import { FINDING_SEVERITY_VALUES, FINDING_STATUS_VALUES } from "@repo/contracts/elise";

const OptionalText = z.string().nullish();

export const LiteFindingSchema = z
  .object({
    id: z.string().min(1),
    priorId: z.string().min(1).nullish(),
    status: z.enum(FINDING_STATUS_VALUES),
    severity: z.enum(FINDING_SEVERITY_VALUES).nullish(),
    title: z.string().min(1),
    class: z.string().min(1),
    location: z.array(z.object({ file: z.string(), line: z.number().int().nullish() })).default([]),
    actor: OptionalText,
    impact: OptionalText,
    evidence: OptionalText,
    fix: OptionalText,
    needs: OptionalText,
  })
  .refine((finding) => finding.status !== "confirmed" || Boolean(finding.severity), {
    message: "a confirmed finding needs a severity",
  });

export const LiteFindingsSchema = z.array(LiteFindingSchema);

// -----
// What the agent could not confirm about a prior
// finding. One it still sees is listed in findings.json
// with its priorId instead, and one it says nothing
// about stays open and unchecked.
// -----
export const RecheckSchema = z.array(z.object({ priorId: z.string().min(1), result: z.enum(["not_found", "cannot_tell"]) }));

// -----
// The list the agent was given, saved when the scan
// launched. Recording reads it back, so the answer is
// judged against what was asked, whatever changed since.
// -----
export const PriorFindingsSchema = z.array(
  z.object({
    priorId: z.string().min(1),
    status: z.enum(FINDING_STATUS_VALUES),
    severity: z.enum(FINDING_SEVERITY_VALUES).nullable(),
    title: z.string(),
    class: z.string(),
    file: z.string().nullable(),
    line: z.number().int().nullable(),
  }),
);

export type LiteFinding = z.infer<typeof LiteFindingSchema>;
export type Recheck = z.infer<typeof RecheckSchema>;
