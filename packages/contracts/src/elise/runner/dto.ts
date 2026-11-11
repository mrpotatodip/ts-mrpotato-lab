import { z } from "zod";
import { RUNNER_JOB_ERROR_MAX, RUNNER_JOB_FILE_MAX, RUNNER_JOB_LOG_MAX, RUNNER_NAME_MAX, RUNNER_PAIRING_CODE_MAX } from "../constants";

export const RunnerIdSchema = z.uuid();

export const CreateRunnerBodySchema = z.object({
  name: z.string().trim().min(1).max(RUNNER_NAME_MAX),
});

export const EnrollRunnerBodySchema = z.object({
  code: z.string().trim().min(1).max(RUNNER_PAIRING_CODE_MAX),
});

export const CreatedRunnerSchema = z.object({
  id: RunnerIdSchema,
  name: z.string(),
  pairingCode: z.string(),
  expiresAt: z.iso.datetime(),
});

export const RunnerIdentitySchema = z.object({
  runnerId: RunnerIdSchema,
  name: z.string(),
  accountId: z.uuid(),
  accountName: z.string(),
});

export const EnrolledRunnerSchema = RunnerIdentitySchema.extend({
  token: z.string(),
});

export const RunnerDisconnectedSchema = z.object({
  disconnected: z.literal(true),
});

export const RunnerParamSchema = z.object({
  runnerId: RunnerIdSchema,
});

// -----
// waiting: a pairing code was made and has not been used or expired.
// expired: the code ran out before the computer paired.
// connected: a computer paired and has not been removed.
// A removed Runner is not listed.
// -----
export const RunnerStateSchema = z.enum(["waiting", "expired", "connected"]);

export const RunnerSchema = z.object({
  id: RunnerIdSchema,
  name: z.string(),
  state: RunnerStateSchema,
  createdAt: z.iso.datetime(),
  expiresAt: z.iso.datetime().nullable(),
  pairedAt: z.iso.datetime().nullable(),
  lastSeenAt: z.iso.datetime().nullable(),
});

export const RunnersSchema = z.array(RunnerSchema);

export const RunnerRemovedSchema = z.object({
  removed: z.literal(true),
});

// -----
// A Scan for a Runner to run. The Runner clones repo at ref (the
// default branch when null), puts priorsJson in prior-findings.json
// when it is not empty, and gives the agent the prompt. The Worker
// builds the prompt, so the audit's words stay in one place.
// -----
export const RunnerJobSchema = z.object({
  scanId: z.string(),
  repo: z.string(),
  ref: z.string().nullable(),
  skill: z.string(),
  model: z.string(),
  effort: z.string(),
  maxBudgetUsd: z.number().positive(),
  prompt: z.string(),
  priorsJson: z.string(),
});

// -----
// What the Runner reports when the agent ends. checkout is what git
// said about the clone: the commit, the branch HEAD was on, and
// whether the ref was fetched as a branch or as something else.
// files holds the deliverables by name; agentLog is the agent's
// own final JSON report, which carries the usage.
// -----
export const RunnerJobResultBodySchema = z.object({
  state: z.enum(["succeeded", "failed"]),
  error: z.string().max(RUNNER_JOB_ERROR_MAX).nullable().optional(),
  checkout: z
    .object({
      commitSha: z.string().nullable(),
      headBranch: z.string().nullable(),
      kind: z.enum(["branch", "other"]).nullable(),
    })
    .nullable()
    .optional(),
  agentLog: z.string().max(RUNNER_JOB_LOG_MAX).nullable().optional(),
  files: z.record(z.string().regex(/^[\w.-]{1,80}$/), z.string().max(RUNNER_JOB_FILE_MAX)).optional(),
});

export const RunnerJobParamSchema = z.object({
  scanId: z.string().regex(/^[\w-]{1,100}$/),
});

export const RunnerJobReportedSchema = z.object({
  accepted: z.literal(true),
});

export type CreateRunnerBody =z.infer<typeof CreateRunnerBodySchema>;
export type EnrollRunnerBody = z.infer<typeof EnrollRunnerBodySchema>;
export type CreatedRunner = z.infer<typeof CreatedRunnerSchema>;
export type RunnerIdentity = z.infer<typeof RunnerIdentitySchema>;
export type EnrolledRunner = z.infer<typeof EnrolledRunnerSchema>;
export type RunnerState = z.infer<typeof RunnerStateSchema>;
export type Runner = z.infer<typeof RunnerSchema>;
export type Runners = z.infer<typeof RunnersSchema>;
export type RunnerJob = z.infer<typeof RunnerJobSchema>;
export type RunnerJobResultBody = z.infer<typeof RunnerJobResultBodySchema>;
