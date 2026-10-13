import { z } from "zod";
import { CHAT_BOT_TURN_ROLE_VALUES } from "../enums";

export const ChatBotTurnSchema = z.object({
  role: z.enum(CHAT_BOT_TURN_ROLE_VALUES),
  content: z.string().min(1),
});

export type ChatBotTurn = z.infer<typeof ChatBotTurnSchema>;
