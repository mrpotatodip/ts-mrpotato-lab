import type { UIMessage } from "@tanstack/ai-client";

import type { ChatBotLatestTurn } from "../types";

// -----
// The latest user message, and the replies
// after it: this turn's, running or done.
// -----
export function toChatBotLatestTurn(messages: ReadonlyArray<UIMessage>): ChatBotLatestTurn {
  const lastUser = messages.findLastIndex((message) => message.role === "user");
  return {
    lastUserId: lastUser >= 0 ? messages[lastUser]?.id : undefined,
    replyIds: new Set(messages.slice(lastUser + 1).map((message) => message.id)),
  };
}
