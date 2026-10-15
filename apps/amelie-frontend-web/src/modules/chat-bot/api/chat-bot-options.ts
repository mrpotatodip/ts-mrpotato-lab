import { z } from "zod";
import type { StreamChunk } from "@tanstack/ai";
import { fetchServerSentEvents } from "@tanstack/ai-react";
import { ChatBotOutputSchema } from "@repo/contracts/chat-bots";
import { ChatBotWirePayloadSchema } from "../schemas";
import type { StaffChatPlace } from "../types";
import { lastUserContent } from "../utils";
import {
  clearChatBotPendingReplyOnRunEnd,
  getChatBotStreamThreadId,
  getStaffChatPlace,
  markChatBotPendingReply,
  notifyChatBotThreadCreated,
  recordChatBotStreamEvent,
  recordChatBotToolDisplay,
} from "../stores";

export function toStaffChatBody(
  init: RequestInit | undefined,
  place: StaffChatPlace,
): string | undefined {
  const raw = z.string().safeParse(init?.body);
  if (!raw.success) return undefined;
  const wire = ChatBotWirePayloadSchema.safeParse(JSON.parse(raw.data));
  return JSON.stringify({
    content: wire.success ? (lastUserContent(wire.data) ?? "") : "",
    threadId: getChatBotStreamThreadId(),
    ...(getChatBotStreamThreadId() === undefined && {
      ...(place.location !== undefined && { location: place.location }),
      ...(place.country !== undefined && { country: place.country }),
    }),
  });
}

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
        const sending = init?.method === "POST";
        const response = await fetch(
          input,
          sending ? { ...init, body: toStaffChatBody(init, getStaffChatPlace()) } : init,
        );
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
