import { z } from "zod";
import { SCAN_SERVABLE_FILES } from "#/constants";
import { SCANS_SCAN_ID_PATTERN } from "#/modules/scans/constants";

export const ScanIdParamSchema = z.object({
  scanId: z.string().regex(SCANS_SCAN_ID_PATTERN).meta({ example: "zd3u73nfd-06ac9c07-b80c-45da-8fc5-ece4768b5b22" }),
});

export const ScanFileParamSchema = ScanIdParamSchema.extend({
  file: z.enum(SCAN_SERVABLE_FILES).meta({ example: "REPORT.md" }),
});

export type ScanIdParam = z.infer<typeof ScanIdParamSchema>;
export type ScanFileParam = z.infer<typeof ScanFileParamSchema>;
