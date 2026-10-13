import { useMemo } from "react";
import type { UIMessage } from "@tanstack/ai-client";

import type { ChatBotLatestTurn } from "../types";
import { toChatBotLatestTurn } from "../utils";

// -----
// Same ids, same object: the turn context
// only changes when a turn or reply starts.
// -----
export function useChatBotTurnFromMessages(
  messages: ReadonlyArray<UIMessage>,
): ChatBotLatestTurn {
  const { lastUserId, replyIds } = toChatBotLatestTurn(messages);
  const replyKey = [...replyIds].join("\n");
  return useMemo(
    () => ({ lastUserId, replyIds: new Set(replyKey ? replyKey.split("\n") : []) }),
    [lastUserId, replyKey],
  );
}
