import { z } from "zod";
import { SCAN_STEP_VALUES, ScanArtifactSchema, ScanUsageSchema } from "@repo/contracts/elise";
import { ScanOptionsSchema } from "./scan-options-schema";

export const ScanStateSchema = z.enum(["queued", "running", "succeeded", "failed"]);

export const ScanStatusSchema = ScanOptionsSchema.extend({
  scanId: z.string().meta({ example: "zd3u73nfd-06ac9c07-b80c-45da-8fc5-ece4768b5b22" }),
  accountId: z.string().meta({ example: "0b8c1d2e-3f4a-4b5c-8d6e-7f8091a2b3c4" }),
  repo: z.string().meta({ example: "https://github.com/octocat/Hello-World" }),
  status: ScanStateSchema.meta({ example: "succeeded" }),
  createdAt: z.string().meta({ example: "2026-11-07T02:45:14.278Z" }),
  updatedAt: z.string(),
  finishedAt: z.string().nullable(),
  error: z.string().nullable(),
  files: z.array(z.string()).nullable().meta({ example: ["REPORT.md", "findings.json"] }),
  artifacts: z.array(ScanArtifactSchema).nullish(),
  step: z.enum(SCAN_STEP_VALUES).nullish().meta({ example: "auditing", description: "Where a running scan is. Null once it ends." }),
  usage: ScanUsageSchema.nullish(),
});

export type ScanState = z.infer<typeof ScanStateSchema>;
export type ScanStatus = z.infer<typeof ScanStatusSchema>;
