import { z } from "zod";
import { ToolFaqScopeRefSchema } from "#/modules/chat-bot/schemas";

export const UpdateFaqInputSchema = z
  .strictObject({
    faqId: z.uuid(),
    question: z.string().trim().min(1).max(200).nullable(),
    answer: z.string().trim().min(1).max(1000).nullable(),
    scope: ToolFaqScopeRefSchema,
  })
  .refine((input) => input.question !== null || input.answer !== null || Boolean(input.scope?.trim()), {
    message: "pass a new question, a new answer, a new scope or a mix",
  });

export type UpdateFaqInput = z.infer<typeof UpdateFaqInputSchema>;
