import type { UIMessage } from "@tanstack/ai-client";

import { chatBotOptions } from "../api";
import { createChatHook } from "@tanstack/ai-react/ui";
import { chatBotHookParts } from "./chat-bot-hook-parts";

type ChatBotOverrides = {
  threadId?: string;
  initialMessages?: Array<UIMessage>;
};

type PersistentChatBotOverrides = ChatBotOverrides & {
  persistence: true;
};

const { useAppChat: useBoundAppChat } = createChatHook({ options: chatBotOptions, ...chatBotHookParts });

function withPersistence(
  overrides?: ChatBotOverrides,
): ChatBotOverrides | PersistentChatBotOverrides {
  if (!overrides?.threadId) return overrides ?? {};
  return {
    threadId: overrides.threadId,
    initialMessages: overrides.initialMessages,
    persistence: true,
  };
}

export function useChatBot(overrides?: ChatBotOverrides) {
  // -----
  // SAFETY: the override type omits persistence,
  // but the runtime reads it to hydrate a thread.
  // -----
  return useBoundAppChat(withPersistence(overrides) as ChatBotOverrides);
}
