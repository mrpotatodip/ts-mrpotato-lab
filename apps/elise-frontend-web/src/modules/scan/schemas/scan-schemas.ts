import { z } from "zod";
import { SCAN_EFFORTS, SCAN_MODELS, SCAN_PROFILES, SCAN_SKILLS } from "@repo/contracts/elise";

export { SCAN_EFFORTS, SCAN_MODELS, SCAN_PROFILES, SCAN_SKILLS, ScanListSchema, ScanQueuedSchema, ScanStateSchema, ScanStatusSchema } from "@repo/contracts/elise";
export type { ScanState, ScanStatus } from "@repo/contracts/elise";

export const CreateScanInputSchema = z.object({
  repo: z.string().regex(/^https:\/\/github\.com\/[\w.-]+\/[\w.-]+?(\.git)?\/?$/, "Use a public https://github.com/owner/name URL"),
  model: z.enum(SCAN_MODELS),
  effort: z.enum(SCAN_EFFORTS),
  skill: z.enum(SCAN_SKILLS),
  profile: z.enum(SCAN_PROFILES),
});

export const ScanIdInputSchema = z.object({ scanId: z.string().regex(/^[\w-]+$/) });

export const ScanFileInputSchema = ScanIdInputSchema.extend({ file: z.string().regex(/^[\w.-]+$/) });

export const ScanCursorInputSchema = z.object({ cursor: z.string().optional() });

export type CreateScanInput = z.infer<typeof CreateScanInputSchema>;
