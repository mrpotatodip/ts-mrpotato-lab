import { z } from "zod";
import { SCAN_AGENT_BUDGET_MAX, SCAN_EFFORTS, SCAN_MODELS, SCAN_PROFILES, SCAN_SKILLS } from "#/constants";
import { ScanOptionsSchema } from "#/schemas";
import { SCANS_GITHUB_REPO } from "#/modules/scans/constants";

export const CreateScanBodySchema = z.object({
  repo: z.string().regex(SCANS_GITHUB_REPO).meta({ example: "https://github.com/octocat/Hello-World" }),
  skill: z.enum(SCAN_SKILLS).optional(),
  model: z.enum(SCAN_MODELS).optional(),
  effort: z.enum(SCAN_EFFORTS).optional(),
  profile: z.enum(SCAN_PROFILES).optional(),
  budget: z.number().int().min(1).max(SCAN_AGENT_BUDGET_MAX).optional(),
  max_budget_usd: z.number().positive().optional(),
});

export const ScanQueuedSchema = ScanOptionsSchema.extend({
  scanId: z.string().meta({ example: "zd3u73nfd-06ac9c07-b80c-45da-8fc5-ece4768b5b22" }),
  status: z.literal("queued"),
});

export type CreateScanBody = z.infer<typeof CreateScanBodySchema>;
export type ScanQueued = z.infer<typeof ScanQueuedSchema>;
