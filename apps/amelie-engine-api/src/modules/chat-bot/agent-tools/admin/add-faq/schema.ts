import { z } from "zod";
import { ToolFaqScopeRefSchema } from "#/modules/chat-bot/schemas";

export const AddFaqInputSchema = z.strictObject({
  categoryId: z.uuid().nullable(),
  question: z.string().trim().min(1).max(200),
  answer: z.string().trim().min(1).max(1000),
  scope: ToolFaqScopeRefSchema,
});

export type AddFaqInput = z.infer<typeof AddFaqInputSchema>;
