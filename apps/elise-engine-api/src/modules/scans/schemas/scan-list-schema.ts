import { z } from "zod";
import { ScanStatusSchema } from "#/schemas";

export { ScanListQuerySchema } from "@repo/contracts/elise";

export const ScanListSchema = z.object({
  scans: z.array(ScanStatusSchema),
  nextCursor: z.string().nullable().meta({ description: "Send it as ?cursor= to get the next page. Null on the last page." }),
});

export type { ScanListQuery } from "@repo/contracts/elise";
export type ScanList = z.infer<typeof ScanListSchema>;
