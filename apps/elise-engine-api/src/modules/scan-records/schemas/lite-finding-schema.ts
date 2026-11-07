import { z } from "zod";
import { FINDING_SEVERITY_VALUES, FINDING_STATUS_VALUES } from "@repo/contracts/elise";

const OptionalText = z.string().nullish();

export const LiteFindingSchema = z
  .object({
    id: z.string().min(1),
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

export type LiteFinding = z.infer<typeof LiteFindingSchema>;
