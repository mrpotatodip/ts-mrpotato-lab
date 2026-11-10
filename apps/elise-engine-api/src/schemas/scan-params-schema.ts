import { z } from "zod";
import { ScanOptionsSchema } from "./scan-options-schema";

// -----
// Set when an install of the Account covers the repo. IDs only,
// never a token: the Outbound handler makes the token when git asks.
// installationRowId is our row; installationId is GitHub's number.
// -----
export const ScanGithubSchema = z.object({
  installationRowId: z.uuid(),
  installationId: z.number(),
  repoId: z.number(),
  repo: z.string(),
  isPrivate: z.boolean(),
});

export const ScanParamsSchema = z.object({
  scanId: z.string(),
  accountId: z.string(),
  repo: z.string(),
  ref: z.string().optional(),
  github: ScanGithubSchema.optional(),
  options: ScanOptionsSchema,
  createdAt: z.string(),
});

export type ScanGithub = z.infer<typeof ScanGithubSchema>;
export type ScanParams = z.infer<typeof ScanParamsSchema>;
