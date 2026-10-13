import { publicChatOptions } from "../api/public-chat-options";
import { createChatHook } from "@tanstack/ai-react/ui";
import { chatBotHookParts } from "./chat-bot-hook-parts";

const { useAppChat: useBoundPublicChat } = createChatHook({ options: publicChatOptions, ...chatBotHookParts });

// -----
// A stored thread reloads from the engine;
// none starts fresh on the first message.
// -----
export function usePublicChat(threadId: string | null) {
  // -----
  // SAFETY: the override type omits persistence,
  // but the runtime reads it to hydrate a thread.
  // -----
  return useBoundPublicChat((threadId ? { threadId, persistence: true } : {}) as { threadId?: string });
}
