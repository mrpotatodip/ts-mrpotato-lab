import type { StreamChunk } from "@tanstack/ai";
import { fetchServerSentEvents } from "@tanstack/ai-react";
import { ChatBotOutputSchema } from "@repo/contracts/chat-bots";

import {
  clearChatBotPendingReplyOnRunEnd,
  getChatBotStreamThreadId,
  markChatBotPendingReply,
  notifyChatBotThreadCreated,
  recordChatBotStreamEvent,
  recordChatBotToolDisplay,
} from "../stores";

export const chatBotOptions = {
  connection: fetchServerSentEvents(
    () => {
      const threadId = getChatBotStreamThreadId();
      return threadId
        ? `/api/chat-bot?threadId=${encodeURIComponent(threadId)}`
        : "/api/chat-bot";
    },
    {
      fetchClient: async (input, init) => {
        const startsNewThread = getChatBotStreamThreadId() === undefined;
        const response = await fetch(input, init);
        const threadId = response.headers.get("X-Thread-Id");
        // -----
        // Only stream responses carry the header:
        // a send, or a rejoin of a running reply.
        // -----
        if (threadId && response.ok) markChatBotPendingReply(threadId);
        // -----
        // Created only when the send had no thread;
        // else the room remounts mid-reply.
        // -----
        if (threadId && startsNewThread) notifyChatBotThreadCreated(threadId);
        return response;
      },
    },
  ),
  outputSchema: ChatBotOutputSchema,
  onChunk: (chunk: StreamChunk) => {
    recordChatBotStreamEvent(chunk);
    clearChatBotPendingReplyOnRunEnd(chunk);
  },
  onCustomEvent: recordChatBotToolDisplay,
};
