import { z } from "zod";

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
});

export const ScanListSchema = z.object({
  scans: z.array(ScanStatusSchema),
  nextCursor: z.string().nullable(),
});

export const ScanQueuedSchema = ScanOptionsSchema.extend({
  scanId: z.string(),
  status: z.literal("queued"),
});

export type ScanState = z.infer<typeof ScanStateSchema>;
export type ScanStatus = z.infer<typeof ScanStatusSchema>;
export type ScanList = z.infer<typeof ScanListSchema>;
export type ScanQueued = z.infer<typeof ScanQueuedSchema>;
