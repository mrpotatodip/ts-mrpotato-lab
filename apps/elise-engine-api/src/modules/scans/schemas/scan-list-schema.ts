import { z } from "zod";
import { ScanStatusSchema } from "#/schemas";

export const ScanListQuerySchema = z.object({
  cursor: z.string().min(1).optional().meta({ description: "The nextCursor of the previous page." }),
});

export const ScanListSchema = z.object({
  scans: z.array(ScanStatusSchema),
  nextCursor: z.string().nullable().meta({ description: "Send it as ?cursor= to get the next page. Null on the last page." }),
});

export type ScanListQuery = z.infer<typeof ScanListQuerySchema>;
export type ScanList = z.infer<typeof ScanListSchema>;
