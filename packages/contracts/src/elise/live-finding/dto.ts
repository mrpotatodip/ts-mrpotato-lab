import { z } from "zod";
import { LIVE_FINDINGS_BATCH_MAX } from "../constants";
import { FINDING_SEVERITY_VALUES } from "../enums";

// -----
// The records of findings.json that a verifier decided
// (skills/security-audit/report-schema.json): the confirmed and the
// needs_validation branch. Only the fields a scan_findings row
// needs are read; the skill's own validator checked the rest. A
// rejected record is never sent and never kept. The result and a
// live batch parse the same shapes.
// -----
const EvidenceSchema = z.object({ file: z.string().min(1), line: z.number().int(), description: z.string() });

export const ConfirmedFindingRecordSchema = z.object({
  verdict: z.literal("confirmed"),
  fingerprint: z.string().min(1),
  title: z.string().min(1),
  description: z.string(),
  severity: z.object({ overall_severity: z.enum(FINDING_SEVERITY_VALUES) }),
  evidence: z.array(EvidenceSchema).default([]),
  remediation: z.object({ strategy: z.string() }),
});

export const NeedsValidationFindingRecordSchema = z.object({
  verdict: z.literal("needs_validation"),
  fingerprint: z.string().min(1),
  title: z.string().min(1),
  description: z.string(),
  evidence: z.array(EvidenceSchema).default([]),
  validation_plan: z.object({ local: z.string().optional(), deployment: z.string().optional() }),
});

export const LiveFindingRecordSchema = z.discriminatedUnion("verdict", [ConfirmedFindingRecordSchema, NeedsValidationFindingRecordSchema]);

// -----
// A batch from a Runner of the records that are new or changed since
// its last batch. A later record with the same fingerprint replaces
// the earlier one, in this batch and across batches. A record
// that does not parse is dropped on its own; the rest are kept.
// -----
export const SaveLiveFindingsBodySchema = z.object({
  findings: z.array(z.unknown()).max(LIVE_FINDINGS_BATCH_MAX),
});

// -----
// How much of a batch was kept. Records of a fingerprint the Scan
// does not hold yet past the per-Scan cap are dropped, not refused,
// so the Runner never retries them.
// -----
export const LiveFindingsSavedSchema = z.object({
  accepted: z.number().int().min(0),
  dropped: z.number().int().min(0),
});

export type ConfirmedFindingRecord = z.infer<typeof ConfirmedFindingRecordSchema>;
export type NeedsValidationFindingRecord = z.infer<typeof NeedsValidationFindingRecordSchema>;
export type LiveFindingRecord = z.infer<typeof LiveFindingRecordSchema>;
export type SaveLiveFindingsBody = z.infer<typeof SaveLiveFindingsBodySchema>;
export type LiveFindingsSaved = z.infer<typeof LiveFindingsSavedSchema>;
