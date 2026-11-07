import type { z } from "zod";
import { ChatBotStreamBodySchema } from "../../chat-bots";

export const StaffChatStreamBodySchema = ChatBotStreamBodySchema;

export type StaffChatStreamBody = z.infer<typeof StaffChatStreamBodySchema>;
