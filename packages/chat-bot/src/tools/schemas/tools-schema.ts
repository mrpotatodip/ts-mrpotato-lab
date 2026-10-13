import { z } from "zod";
import { ChatBotJsonSchema } from "@repo/contracts/chat-bots";

export const ChatBotHttpEnvelopeSchema = z.object({
  data: ChatBotJsonSchema,
  error: z.object({ message: z.string() }).nullable(),
});

export const ChatBotToolInputFieldsSchema = z.record(z.string(), ChatBotJsonSchema);

export type ChatBotHttpEnvelope = z.infer<typeof ChatBotHttpEnvelopeSchema>;
export type ChatBotToolInputFields = z.infer<typeof ChatBotToolInputFieldsSchema>;
