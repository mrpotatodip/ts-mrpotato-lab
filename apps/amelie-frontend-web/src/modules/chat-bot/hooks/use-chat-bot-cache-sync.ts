import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { chatBotToolDisplayStore } from "../stores";
import { toChatBotCacheKeys } from "../utils/to-chat-bot-cache-keys";

export function useChatBotCacheSync() {
  const queryClient = useQueryClient();
  const seen = useRef(new Set<string>());

  useEffect(() => {
    const flush = () => {
      for (const [toolCallId, event] of chatBotToolDisplayStore.get()) {
        if (seen.current.has(toolCallId)) continue;
        seen.current.add(toolCallId);
        for (const queryKey of toChatBotCacheKeys(event.tool, event.result)) {
          void queryClient.invalidateQueries({ queryKey });
        }
      }
    };
    flush();
    return chatBotToolDisplayStore.subscribe(flush);
  }, [queryClient]);
}
