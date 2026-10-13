import type { ChatClientOptions } from "@tanstack/ai-client";
import {
  CHAT_BOT_TOOL_DISPLAY_EVENT,
  ChatBotToolDisplayEventValueSchema,
  type ChatBotToolDisplayEventValue,
} from "@repo/contracts/chat-bots";

import { createChatBotStore } from "./create-chat-bot-store";

export const chatBotToolDisplayStore = createChatBotStore<
  ReadonlyMap<string, ChatBotToolDisplayEventValue>
>(() => new Map());

// -----
// Live tool-display events by toolCallId;
// saved messages read their structure.
// -----
export const recordChatBotToolDisplay: NonNullable<
  ChatClientOptions["onCustomEvent"]
> = (name, value) => {
  if (name !== CHAT_BOT_TOOL_DISPLAY_EVENT) return;
  const parsed = ChatBotToolDisplayEventValueSchema.safeParse(value);
  if (!parsed.success) return;
  const next = new Map(chatBotToolDisplayStore.get());
  next.set(parsed.data.toolCallId, parsed.data);
  chatBotToolDisplayStore.set(next);
};
