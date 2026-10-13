import { z } from "zod";

export { SetThreadLocationResultSchema, type SetThreadLocationResult } from "@repo/contracts/chat-bots";

export const SetThreadLocationInputSchema = z.strictObject({
  location: z.string().trim().min(1).max(120),
});

export type SetThreadLocationInput = z.infer<typeof SetThreadLocationInputSchema>;
