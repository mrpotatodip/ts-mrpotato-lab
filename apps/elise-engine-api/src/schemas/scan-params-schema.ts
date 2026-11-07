import { z } from "zod";
import { ScanOptionsSchema } from "./scan-options-schema";

export const ScanParamsSchema = z.object({
  scanId: z.string(),
  accountId: z.string(),
  repo: z.string(),
  options: ScanOptionsSchema,
  createdAt: z.string(),
});

export type ScanParams = z.infer<typeof ScanParamsSchema>;
