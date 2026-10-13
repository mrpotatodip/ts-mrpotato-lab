import { z } from "zod";
import { ChatBotJsonSchema, ChatBotStructureSchema } from "@repo/contracts/chat-bots";

export const ChatBotMessageMetadataSchema = z.object({
  chatBot: z.object({
    toolsUsed: z.array(z.string()),
    structure: ChatBotStructureSchema,
  }),
});

export const ChatBotRowSchema = z.record(z.string(), ChatBotJsonSchema);

export type ChatBotMessageMetadata = z.infer<typeof ChatBotMessageMetadataSchema>;
export type ChatBotRow = z.infer<typeof ChatBotRowSchema>;
