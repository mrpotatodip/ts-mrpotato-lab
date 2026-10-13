import { z } from "zod";
import { ToolLocationRefSchema } from "#/modules/chat-bot/schemas";

export { ListFaqsResultSchema, type ListFaqsResult } from "@repo/contracts/chat-bots";

export const ListFaqsInputSchema = z.strictObject({
  locationId: ToolLocationRefSchema,
});

export type ListFaqsInput = z.infer<typeof ListFaqsInputSchema>;
