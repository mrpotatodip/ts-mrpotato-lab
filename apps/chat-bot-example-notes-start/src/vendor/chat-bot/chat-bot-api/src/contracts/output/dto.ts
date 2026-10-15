import { z } from "zod";

export const ChatBotOutputSchema = z.object({
  answer: z.string().min(1),
});

export type ChatBotOutput = z.infer<typeof ChatBotOutputSchema>;
