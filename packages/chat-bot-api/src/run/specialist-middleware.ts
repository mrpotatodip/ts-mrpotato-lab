import { defineChatMiddleware, type ChatMiddlewareConfig, type ModelMessage } from "@tanstack/ai";
import { z } from "zod";
import { CHAT_BOT_EMPTY_HANDOFF, CHAT_BOT_SPECIALIST_PREFIX } from "../constants";

export function toChatBotSpecialistPrompt(reply: string): string {
  return `${CHAT_BOT_SPECIALIST_PREFIX}${reply}`;
}

// -----
// History is read from the DB and ends on the
// user's message, so a plain assistant message
// right after it can only be the handoff's.
// -----
const ChatBotHandoffMessageSchema = z.object({
  role: z.literal("assistant"),
  content: z.string(),
  toolCalls: z.array(z.unknown()).max(0).optional(),
});

function handoffText(messages: ReadonlyArray<ModelMessage>): string | null {
  if (messages.at(-2)?.role !== "user") return null;
  const parsed = ChatBotHandoffMessageSchema.safeParse(messages.at(-1));
  return parsed.success ? parsed.data.content : null;
}

// -----
// A handoff reply looks like main's own past
// reply, so main disbelieves it. Move it into
// the instructions for the model call only.
// -----
export function toChatBotSpecialistConfig(
  config: ChatMiddlewareConfig,
): Partial<ChatMiddlewareConfig> | undefined {
  const text = handoffText(config.messages);
  if (text === null) return undefined;
  const reply = text.trim();
  const prompt = toChatBotSpecialistPrompt(reply);
  const known = reply === "" || reply === CHAT_BOT_EMPTY_HANDOFF;
  return {
    providerMessages: config.messages.slice(0, -1),
    // -----
    // onConfig runs every iteration and its
    // prompts carry over, so add it once.
    // -----
    systemPrompts:
      known || config.systemPrompts.includes(prompt)
        ? config.systemPrompts
        : [...config.systemPrompts, prompt],
  };
}

export const chatBotSpecialistMiddleware = defineChatMiddleware({
  name: "chat-bot-specialist",
  onConfig: (_ctx, config) => toChatBotSpecialistConfig(config),
});
