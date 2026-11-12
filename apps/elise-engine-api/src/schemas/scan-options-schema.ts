import { z } from "zod";
import { SCAN_EFFORTS, SCAN_MODELS, SCAN_PROFILES, SCAN_SKILLS } from "#/constants";

export const ScanOptionsSchema = z.object({
  skill: z.enum(SCAN_SKILLS).meta({ example: "lite" }),
  model: z.enum(SCAN_MODELS).meta({ example: "claude-haiku-5-5" }),
  effort: z.enum(SCAN_EFFORTS).meta({ example: "low" }),
  profile: z.enum(SCAN_PROFILES).meta({ example: "quick" }),
  maxBudgetUsd: z.number().positive().meta({ example: 1 }),
});

export type ScanOptions = z.infer<typeof ScanOptionsSchema>;
