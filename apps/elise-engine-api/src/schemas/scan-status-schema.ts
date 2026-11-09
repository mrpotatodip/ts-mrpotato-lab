import { z } from "zod";
import { SCAN_RECORDED_MODELS, SCAN_STEP_VALUES, ScanArtifactSchema, ScanSummarySchema, ScanUsageSchema } from "@repo/contracts/elise";
import { ScanOptionsSchema } from "./scan-options-schema";

export const ScanStateSchema = z.enum(["queued", "running", "succeeded", "failed"]);

export const ScanStatusSchema = ScanOptionsSchema.extend({
  model: z.enum(SCAN_RECORDED_MODELS).meta({ example: "claude-haiku-5-5", description: "The model the scan ran with. A stored scan may carry one that new scans no longer offer." }),
  scanId: z.string().meta({ example: "zd3u73nfd-06ac9c07-b80c-45da-8fc5-ece4768b5b22" }),
  accountId: z.string().meta({ example: "0b8c1d2e-3f4a-4b5c-8d6e-7f8091a2b3c4" }),
  repo: z.string().meta({ example: "https://github.com/octocat/Hello-World" }),
  repoId: z.uuid().meta({ description: "The repo's record in this account. Every scan of the same repo shares it, however the URL was spelled." }),
  commitSha: z.string().nullish().meta({ example: "7fd1a60b01f91b314f59955a4e4d4e80d8edf11d", description: "The commit the scan read. Null until the repo is cloned." }),
  ref: z.string().nullish().meta({ example: "main", description: "The branch, tag or commit the caller asked for. Null means the default branch." }),
  branch: z.string().nullish().meta({ example: "main", description: "The name of the branch the scan read, when it is known. Null for a tag, a commit or a detached HEAD." }),
  branchId: z.uuid().nullish().meta({ description: "The tracked branch the scan belongs to. Null for a one-off scan, which has no History." }),
  untrackedReason: z.string().nullish().meta({ example: "the repo already tracks 25 branches", description: "Why a finished scan has no branch, so no History. Null when it has one." }),
  status: ScanStateSchema.meta({ example: "succeeded" }),
  createdAt: z.string().meta({ example: "2026-11-07T02:45:14.278Z" }),
  updatedAt: z.string(),
  finishedAt: z.string().nullable(),
  error: z.string().nullable(),
  files: z.array(z.string()).nullable().meta({ example: ["REPORT.md", "findings.json"] }),
  artifacts: z.array(ScanArtifactSchema).nullish(),
  step: z.enum(SCAN_STEP_VALUES).nullish().meta({ example: "auditing", description: "Where a running scan is. Null once it ends." }),
  usage: ScanUsageSchema.nullish(),
  summary: ScanSummarySchema.nullish().meta({ description: "What a finished lite scan found. Null for any other scan." }),
});

export type ScanState = z.infer<typeof ScanStateSchema>;
export type ScanStatus = z.infer<typeof ScanStatusSchema>;
