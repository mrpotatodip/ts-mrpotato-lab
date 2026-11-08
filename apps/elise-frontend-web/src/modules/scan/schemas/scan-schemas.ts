import { z } from "zod";
import { SCAN_EFFORTS, SCAN_MODELS, SCAN_PROFILES, SCAN_SKILLS } from "@repo/contracts/elise";

export { SCAN_EFFORTS, SCAN_MODELS, SCAN_PROFILES, SCAN_SKILLS, RepoDetailSchema, RepoListSchema, RepoParamSchema, ScanListSchema, ScanQueuedSchema, ScanStateSchema, ScanStatusSchema } from "@repo/contracts/elise";
export type { Repo, RepoBranch, ScanState, ScanStatus } from "@repo/contracts/elise";

export const CreateScanInputSchema = z.object({
  repo: z.string().regex(/^https:\/\/github\.com\/[\w.-]+\/[\w.-]+?(\.git)?\/?$/, "That doesn't look like a GitHub repository link. Use the form https://github.com/owner/name."),
  model: z.enum(SCAN_MODELS),
  effort: z.enum(SCAN_EFFORTS),
  skill: z.enum(SCAN_SKILLS),
  profile: z.enum(SCAN_PROFILES),
  ref: z.string().optional(),
});

export const ScanIdInputSchema = z.object({ scanId: z.string().regex(/^[\w-]+$/) });

export const ScanFileInputSchema = ScanIdInputSchema.extend({ file: z.string().regex(/^[\w.-]+$/) });

export const ScanCursorInputSchema = z.object({ cursor: z.string().optional() });

export type CreateScanInput = z.infer<typeof CreateScanInputSchema>;

export { DiffEntrySchema, ScanDiffSchema } from "@repo/contracts/elise";
export type { DiffEntry, ScanDiff } from "@repo/contracts/elise";

export type { SeverityCounts } from "@repo/contracts/elise";

export const VerdictInputSchema = z.object({ repoId: z.string().regex(/^[\w-]+$/), commit: z.string().regex(/^[0-9a-fA-F]{40}$/) });

export { VerdictSchema } from "@repo/contracts/elise";
export type { Verdict, VerdictFinding } from "@repo/contracts/elise";
