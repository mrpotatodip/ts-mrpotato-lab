import { z } from "zod";
import { RUNNER_NAME_MAX, RUNNER_PAIRING_CODE_MAX } from "../constants";

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

export type CreateRunnerBody =z.infer<typeof CreateRunnerBodySchema>;
export type EnrollRunnerBody = z.infer<typeof EnrollRunnerBodySchema>;
export type CreatedRunner = z.infer<typeof CreatedRunnerSchema>;
export type RunnerIdentity = z.infer<typeof RunnerIdentitySchema>;
export type EnrolledRunner = z.infer<typeof EnrolledRunnerSchema>;
export type RunnerState = z.infer<typeof RunnerStateSchema>;
export type Runner = z.infer<typeof RunnerSchema>;
export type Runners = z.infer<typeof RunnersSchema>;
