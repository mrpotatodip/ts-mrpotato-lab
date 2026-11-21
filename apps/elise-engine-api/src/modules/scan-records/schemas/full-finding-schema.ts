import { z } from "zod";
import { ConfirmedFindingRecordSchema, NeedsValidationFindingRecordSchema } from "@repo/contracts/elise";

// -----
// The nested record the full skill writes to findings.json
// (skills/security-audit/report-schema.json). The confirmed and
// needs_validation shapes are the contract's, which a live batch
// parses too. A rejected record is not recorded, so nothing of it
// is read.
// -----
const RejectedSchema = z.object({ verdict: z.literal("rejected") });

export const FullFindingsSchema = z.array(z.discriminatedUnion("verdict", [ConfirmedFindingRecordSchema, NeedsValidationFindingRecordSchema, RejectedSchema]));

export type FullFinding = Exclude<z.infer<typeof FullFindingsSchema>[number], { verdict: "rejected" }>;
