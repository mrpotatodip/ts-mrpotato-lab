import { z } from "zod";
import { ACCEPTED_RISK_MAX_DAYS } from "../constants";
import { FINDING_SEVERITY_VALUES, FINDING_STATUS_VALUES, FINDING_TRIAGE_STATUS_VALUES, REPO_FINDING_STATE_VALUES, SCAN_STEP_VALUES } from "../enums";

export const SCAN_MODELS = ["claude-sonnet-5-5", "claude-haiku-5-5"] as const;
// Opus is not offered for new scans, but a stored scan may still carry it.
export const SCAN_RECORDED_MODELS =[...SCAN_MODELS, "claude-opus-5-5"] as const;
export const SCAN_EFFORTS = ["low", "medium", "high", "xhigh", "max"] as const;
export const SCAN_SKILLS = ["lite", "full"] as const;
export const SCAN_PROFILES = ["quick", "standard", "deep"] as const;

// -----
// Responses: what GET /scans and GET /scans/:scanId answer
// -----
export const ScanStateSchema = z.enum(["queued", "running", "succeeded", "failed"]);

export const ScanOptionsSchema = z.object({
  skill: z.enum(SCAN_SKILLS),
  model: z.enum(SCAN_RECORDED_MODELS),
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

// -----
// What a finished scan found, so a list needs no extra fetch.
// carried are problems from earlier scans that the agent
// re-checked and still saw. Null for a scan that has no
// recorded findings (running, failed, or the full skill).
// -----
export const SeverityCountsSchema = z.object({
  critical: z.number().int().min(0),
  high: z.number().int().min(0),
  medium: z.number().int().min(0),
  low: z.number().int().min(0),
  informational: z.number().int().min(0),
});

// -----
// How the agent answered for the problems it was given to
// re-check: given, still there (carried), gone (closed) and
// left unchecked. "12 given, 0 carried, 0 closed" means the
// agent did not do the re-check. Null when none were asked.
// -----
export const RecheckTallySchema = z.object({
  given: z.number().int().min(0),
  carried: z.number().int().min(0),
  closed: z.number().int().min(0),
  unchecked: z.number().int().min(0),
});

export const ScanSummarySchema = z.object({
  total: z.number().int().min(0),
  severity: SeverityCountsSchema,
  needsValidation: z.number().int().min(0),
  new: z.number().int().min(0),
  carried: z.number().int().min(0),
  recheck: RecheckTallySchema.nullable(),
});

export const ScanStatusSchema = ScanOptionsSchema.extend({
  scanId: z.string(),
  accountId: z.string(),
  repo: z.string(),
  repoId: z.uuid(),
  commitSha: z.string().nullish(),
  ref: z.string().nullish(),
  branch: z.string().nullish(),
  branchId: z.uuid().nullish(),
  untrackedReason: z.string().nullish(),
  status: ScanStateSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
  finishedAt: z.string().nullable(),
  error: z.string().nullable(),
  files: z.array(z.string()).nullable(),
  artifacts: z.array(ScanArtifactSchema).nullish(),
  step: z.enum(SCAN_STEP_VALUES).nullish(),
  usage: ScanUsageSchema.nullish(),
  summary: ScanSummarySchema.nullish(),
});

export const ScanListSchema = z.object({
  scans: z.array(ScanStatusSchema),
  nextCursor: z.string().nullable(),
});

export const ScanQueuedSchema = ScanOptionsSchema.extend({
  scanId: z.string(),
  status: z.literal("queued"),
});

export type SeverityCounts = z.infer<typeof SeverityCountsSchema>;
export type RecheckTally = z.infer<typeof RecheckTallySchema>;
export type ScanSummary = z.infer<typeof ScanSummarySchema>;
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
  acceptedUntil: z.string().nullable(),
  updatedAt: z.string(),
  decidedBy: z.string().nullable().default(null),
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

// -----
// An accepted risk needs a reason and a number of days (at most
// ACCEPTED_RISK_MAX_DAYS); no other status takes days.
// -----
export const FindingTriageBodySchema = z
  .object({
    repo: z.string().min(1),
    fingerprint: z.string().regex(/^[0-9a-f]{64}$/),
    status: z.enum(FINDING_TRIAGE_STATUS_VALUES),
    note: z.string().max(2000).nullish(),
    acceptDays: z.number().int().min(1).max(ACCEPTED_RISK_MAX_DAYS).optional(),
  })
  .superRefine((body, ctx) => {
    if (body.status === "accepted_risk") {
      if (!body.note?.trim()) ctx.addIssue({ code: "custom", path: ["note"], message: "An accepted risk needs a reason" });
      if (body.acceptDays === undefined) ctx.addIssue({ code: "custom", path: ["acceptDays"], message: "An accepted risk needs a number of days" });
    } else if (body.acceptDays !== undefined) {
      ctx.addIssue({ code: "custom", path: ["acceptDays"], message: "Only an accepted risk takes days" });
    }
  });

export type Usage = z.infer<typeof UsageSchema>;
export type FindingTriage = z.infer<typeof FindingTriageSchema>;
export type Finding = z.infer<typeof FindingSchema>;
export type FindingList = z.infer<typeof FindingListSchema>;
export type FindingsQuery = z.infer<typeof FindingsQuerySchema>;
export type FindingTriageBody = z.infer<typeof FindingTriageBodySchema>;

// -----
// Repos: one record per repo an account scans, with its history
// -----
export const RepoOpenSchema = z.object({
  total: z.number().int().min(0),
  severity: SeverityCountsSchema,
  needsValidation: z.number().int().min(0),
  regressed: z.number().int().min(0),
  unchecked: z.number().int().min(0),
});

// -----
// open is the default branch's: a problem on two branches
// is not counted twice. The detail has the counts of each.
// branchNames are the tracked branches, oldest first, so a list
// can show them without opening each repo.
// -----
export const RepoSchema = z.object({
  id: z.uuid(),
  url: z.string(),
  canonical: z.string(),
  defaultBranch: z.string().nullable(),
  branchNames: z.array(z.string()),
  scans: z.number().int().min(0),
  lastScanId: z.string().nullable(),
  lastScanStatus: ScanStateSchema.nullable(),
  lastScanAt: z.string().nullable(),
  open: RepoOpenSchema,
});

export const RepoListSchema = z.object({ repos: z.array(RepoSchema) });

// -----
// A branch with its own history. latestCommit is the commit of
// its newest succeeded scan: the commit to ask the verdict about.
// -----
export const RepoBranchSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  isDefault: z.boolean(),
  open: RepoOpenSchema,
  latestScanId: z.string().nullable(),
  latestCommit: z.string().nullable(),
  latestScanAt: z.string().nullable(),
});

export const RepoBranchListSchema = z.object({ branches: z.array(RepoBranchSchema) });

export const RepoDetailSchema = RepoSchema.extend({ history: z.array(ScanStatusSchema), branches: z.array(RepoBranchSchema) });

export const RepoParamSchema = z.object({ repoId: z.uuid() });

export const RepoFindingSchema = FindingSchema.extend({
  state: z.enum(REPO_FINDING_STATE_VALUES),
  unchecked: z.boolean(),
  firstSeenScanId: z.string(),
  fixedInScanId: z.string().nullable(),
  possibleDuplicateOf: z.string().nullable(),
});

export const RepoFindingsQuerySchema = z.object({
  branch: z.string().min(1).optional(),
  state: z.enum(REPO_FINDING_STATE_VALUES).optional(),
  severity: z.enum(FINDING_SEVERITY_VALUES).optional(),
  triage: z.enum(FINDING_TRIAGE_STATUS_VALUES).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().regex(/^\d+$/).optional(),
});

export const RepoFindingListSchema = z.object({ findings: z.array(RepoFindingSchema), nextCursor: z.string().nullable() });

// -----
// GET /scans/:scanId/diff. Compared with the previous succeeded
// lite scan of the same repo. fixed are problems the agent
// checked and found gone; notRechecked are ones that vanished
// from the list without that evidence.
// -----
export const DiffEntrySchema = z.object({
  fingerprint: z.string(),
  status: z.enum(FINDING_STATUS_VALUES),
  severity: z.enum(FINDING_SEVERITY_VALUES).nullable(),
  title: z.string(),
  class: z.string(),
  file: z.string().nullable(),
  line: z.number().int().nullable(),
});

export const ScanDiffSchema = z.object({
  scanId: z.string(),
  previousScanId: z.string().nullable(),
  new: z.array(DiffEntrySchema),
  stillOpen: z.array(DiffEntrySchema),
  regressed: z.array(DiffEntrySchema),
  fixed: z.array(DiffEntrySchema),
  notRechecked: z.array(DiffEntrySchema),
});

export const ScanListQuerySchema = z.object({
  cursor: z.string().min(1).optional(),
  repoId: z.uuid().optional(),
  status: ScanStateSchema.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export type ScanListQuery = z.infer<typeof ScanListQuerySchema>;
export type RepoOpen = z.infer<typeof RepoOpenSchema>;
export type Repo = z.infer<typeof RepoSchema>;
export type RepoList = z.infer<typeof RepoListSchema>;
export type RepoBranch = z.infer<typeof RepoBranchSchema>;
export type RepoBranchList = z.infer<typeof RepoBranchListSchema>;
export type RepoDetail = z.infer<typeof RepoDetailSchema>;
export type RepoFinding = z.infer<typeof RepoFindingSchema>;
export type RepoFindingsQuery = z.infer<typeof RepoFindingsQuerySchema>;
export type RepoFindingList = z.infer<typeof RepoFindingListSchema>;
export type DiffEntry = z.infer<typeof DiffEntrySchema>;
export type ScanDiff = z.infer<typeof ScanDiffSchema>;
