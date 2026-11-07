import { z } from "zod";
import { FINDING_SEVERITY_VALUES, FINDING_STATUS_VALUES, FINDING_TRIAGE_STATUS_VALUES, SCAN_STEP_VALUES } from "../enums";

export const SCAN_MODELS = ["claude-sonnet-5-5", "claude-opus-5-5", "claude-haiku-5-5"] as const;
export const SCAN_EFFORTS = ["low", "medium", "high", "xhigh", "max"] as const;
export const SCAN_SKILLS = ["lite", "full"] as const;
export const SCAN_PROFILES = ["quick", "standard", "deep"] as const;

// -----
// Responses: what GET /scans and GET /scans/:scanId answer
// -----
export const ScanStateSchema = z.enum(["queued", "running", "succeeded", "failed"]);

export const ScanOptionsSchema = z.object({
  skill: z.enum(SCAN_SKILLS),
  model: z.enum(SCAN_MODELS),
  effort: z.enum(SCAN_EFFORTS),
  profile: z.enum(SCAN_PROFILES),
  budget: z.number().int().min(1).optional(),
  maxBudgetUsd: z.number().positive(),
});

// -----
// What a scan spent. Tokens come from the agent's own
// report; costUsd is its estimate at the model's list price.
// -----
export const ScanUsageSchema = z.object({
  inputTokens: z.number().int().min(0),
  outputTokens: z.number().int().min(0),
  cacheReadTokens: z.number().int().min(0),
  cacheWriteTokens: z.number().int().min(0),
  costUsd: z.number().min(0),
  turns: z.number().int().min(0).nullable(),
  durationMs: z.number().int().min(0).nullable(),
});

// -----
// A file the scan saved. The bytes live in R2; this row
// in Neon says what exists, how big it is, and its key.
// -----
export const ScanArtifactSchema = z.object({
  name: z.string(),
  sizeBytes: z.number().int().min(0),
  contentType: z.string(),
});

export const ScanStatusSchema = ScanOptionsSchema.extend({
  scanId: z.string(),
  accountId: z.string(),
  repo: z.string(),
  status: ScanStateSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
  finishedAt: z.string().nullable(),
  error: z.string().nullable(),
  files: z.array(z.string()).nullable(),
  artifacts: z.array(ScanArtifactSchema).nullish(),
  step: z.enum(SCAN_STEP_VALUES).nullish(),
  usage: ScanUsageSchema.nullish(),
});

export const ScanListSchema = z.object({
  scans: z.array(ScanStatusSchema),
  nextCursor: z.string().nullable(),
});

export const ScanQueuedSchema = ScanOptionsSchema.extend({
  scanId: z.string(),
  status: z.literal("queued"),
});

export type ScanArtifact = z.infer<typeof ScanArtifactSchema>;
export type ScanUsage = z.infer<typeof ScanUsageSchema>;
export type ScanState = z.infer<typeof ScanStateSchema>;
export type ScanStatus = z.infer<typeof ScanStatusSchema>;
export type ScanList = z.infer<typeof ScanListSchema>;
export type ScanQueued = z.infer<typeof ScanQueuedSchema>;

// -----
// GET /usage: what the account spent this month (UTC) and what is left.
// reservedUsd is the cap of the scans that are still running.
// -----
export const UsageSchema = z.object({
  month: z.string(),
  budgetUsd: z.number().min(0),
  spentUsd: z.number().min(0),
  reservedUsd: z.number().min(0),
  remainingUsd: z.number(),
  scans: z.number().int().min(0),
  tokens: z.object({
    input: z.number().int().min(0),
    output: z.number().int().min(0),
    cacheRead: z.number().int().min(0),
    cacheWrite: z.number().int().min(0),
  }),
});

// -----
// GET /findings and PUT /findings/triage
// -----
export const FindingTriageSchema = z.object({
  status: z.enum(FINDING_TRIAGE_STATUS_VALUES),
  note: z.string().nullable(),
  updatedAt: z.string(),
});

export const FindingSchema = z.object({
  id: z.uuid(),
  scanId: z.string(),
  repo: z.string(),
  findingId: z.string(),
  fingerprint: z.string(),
  status: z.enum(FINDING_STATUS_VALUES),
  severity: z.enum(FINDING_SEVERITY_VALUES).nullable(),
  title: z.string(),
  class: z.string(),
  file: z.string().nullable(),
  line: z.number().int().nullable(),
  actor: z.string().nullable(),
  impact: z.string().nullable(),
  evidence: z.string().nullable(),
  fix: z.string().nullable(),
  needs: z.string().nullable(),
  createdAt: z.string(),
  triage: FindingTriageSchema.nullable(),
});

export const FindingListSchema = z.object({
  findings: z.array(FindingSchema),
  nextCursor: z.string().nullable(),
});

export const FindingsQuerySchema = z.object({
  repo: z.string().optional(),
  scanId: z.string().optional(),
  severity: z.enum(FINDING_SEVERITY_VALUES).optional(),
  status: z.enum(FINDING_STATUS_VALUES).optional(),
  triage: z.enum(FINDING_TRIAGE_STATUS_VALUES).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().regex(/^\d+$/).optional(),
});

export const FindingTriageBodySchema = z.object({
  repo: z.string().min(1),
  fingerprint: z.string().regex(/^[0-9a-f]{64}$/),
  status: z.enum(FINDING_TRIAGE_STATUS_VALUES),
  note: z.string().max(2000).nullish(),
});

export type Usage = z.infer<typeof UsageSchema>;
export type FindingTriage = z.infer<typeof FindingTriageSchema>;
export type Finding = z.infer<typeof FindingSchema>;
export type FindingList = z.infer<typeof FindingListSchema>;
export type FindingsQuery = z.infer<typeof FindingsQuerySchema>;
export type FindingTriageBody = z.infer<typeof FindingTriageBodySchema>;
