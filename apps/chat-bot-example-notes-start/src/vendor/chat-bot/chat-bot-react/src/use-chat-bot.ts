import type { StreamChunk } from "@tanstack/ai";
import { fetchServerSentEvents, useChat } from "@tanstack/ai-react";
import { useMemo, useRef } from "react";
import { CHAT_BOT_THREAD_ID_HEADER } from "@repo/chat-bot-api/contracts";
import { resolveHeaders, type ChatBotRequestOptions } from "./api";

export type UseChatBotOptions = Omit<ChatBotRequestOptions, "endpoint"> & {
  endpoint?: string;
  // A stored thread to open. Leave it out to start a new one.
  threadId?: string;
  // Called once, with the id the server gave a new thread.
  onThreadCreated?: (threadId: string) => void;
  // Every event of the answer stream, as it arrives. For things like a progress display.
  onChunk?: (chunk: StreamChunk) => void;
  // Called when a message is sent, before anything is streamed.
  onTurnStart?: () => void;
};

export const DEFAULT_ENDPOINT = "/api/chat";

// -----
// useChat, pointed at the engine. It keeps one
// conversation: a new thread's id comes back in a
// response header, and every later message names it
// in the URL. Open a stored thread with threadId and
// it is loaded for you. To switch threads, remount
// (give the component that calls this a new key).
// -----
export function useChatBot(options: UseChatBotOptions = {}) {
  const { endpoint = DEFAULT_ENDPOINT, threadId, headers, credentials, onThreadCreated } = options;
  const activeThread = useRef<string | undefined>(threadId);
  const latest = useRef({
    headers,
    onThreadCreated,
    fetch: options.fetch,
    onChunk: options.onChunk,
    onTurnStart: options.onTurnStart,
  });
  latest.current = {
    headers,
    onThreadCreated,
    fetch: options.fetch,
    onChunk: options.onChunk,
    onTurnStart: options.onTurnStart,
  };

  const connection = useMemo(
    () =>
      fetchServerSentEvents(
        () => (activeThread.current ? `${endpoint}?threadId=${encodeURIComponent(activeThread.current)}` : endpoint),
        () => ({
          credentials,
          headers: resolveHeaders(latest.current.headers),
          fetchClient: async (input: RequestInfo | URL, init?: RequestInit) => {
            const send = latest.current.fetch ?? globalThis.fetch;
            const response = await send(input, init);
            const created = response.headers.get(CHAT_BOT_THREAD_ID_HEADER);
            if (created && response.ok && activeThread.current === undefined) {
              activeThread.current = created;
              latest.current.onThreadCreated?.(created);
            }
            return response;
          },
        }),
      ),
    [endpoint, credentials],
  );

  // -----
  // Stable wrappers: useChat keeps the first function it
  // is given, so these read the latest callback from the ref.
  // -----
  const onChunk = (chunk: StreamChunk) => latest.current.onChunk?.(chunk);
  const chat = useChat(
    threadId === undefined
      ? { connection, onChunk }
      : { connection, onChunk, threadId, persistence: true },
  );

  const send = (content: Parameters<typeof chat.sendMessage>[0]) => {
    latest.current.onTurnStart?.();
    return chat.sendMessage(content);
  };

  return {
    messages: chat.messages,
    send,
    stop: chat.stop,
    isLoading: chat.isLoading,
    error: chat.error,
    getThreadId: () => activeThread.current,
  };
}
