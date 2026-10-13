import { z } from "zod";

export { ReportMissingInformationResultSchema, type ReportMissingInformationResult } from "@repo/contracts/chat-bots";

export const ReportMissingInformationInputSchema = z.strictObject({
  topic: z.string().min(1).max(60),
});

export type ReportMissingInformationInput = z.infer<typeof ReportMissingInformationInputSchema>;
