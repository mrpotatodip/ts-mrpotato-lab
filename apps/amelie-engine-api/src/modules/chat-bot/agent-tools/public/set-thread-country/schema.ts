import { z } from "zod";

export { SetThreadCountryResultSchema, type SetThreadCountryResult } from "@repo/contracts/chat-bots";

export const SetThreadCountryInputSchema = z.strictObject({
  country: z.string().trim().min(1).max(120),
});

export type SetThreadCountryInput = z.infer<typeof SetThreadCountryInputSchema>;
