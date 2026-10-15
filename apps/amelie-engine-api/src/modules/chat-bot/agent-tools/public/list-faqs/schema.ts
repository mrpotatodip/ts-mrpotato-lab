import { z } from "zod";
import { ToolLocationRefSchema } from "#/modules/chat-bot/schemas";

export { ListFaqsResultSchema, type ListFaqsResult } from "@repo/contracts/chat-bots";

export const ListFaqsInputSchema = z.strictObject({
  locationId: ToolLocationRefSchema,
  topic: z.string().trim().max(120).nullish(),
});

export type ListFaqsInput = z.infer<typeof ListFaqsInputSchema>;
