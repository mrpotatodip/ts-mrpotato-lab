import { useCallback, useEffect, useMemo, useState } from "react";
import type { ChatBotThreadListItem } from "@repo/chat-bot-api/contracts";
import { deleteThread, fetchThreads, renameThread, type ChatBotRequestOptions } from "./api";
import { DEFAULT_ENDPOINT } from "./use-chat-bot";

export type UseChatBotThreadsOptions = Omit<ChatBotRequestOptions, "endpoint"> & { endpoint?: string };

// -----
// The caller's threads: load, rename, delete.
// refresh() reloads them, e.g. after a new thread
// is created.
// -----
export function useChatBotThreads(options: UseChatBotThreadsOptions = {}) {
  const { endpoint = DEFAULT_ENDPOINT, headers, credentials, fetch } = options;
  const request = useMemo(
    () => ({ endpoint, headers, credentials, fetch }),
    [endpoint, headers, credentials, fetch],
  );
  const [threads, setThreads] = useState<ChatBotThreadListItem[]>([]);
  const [error, setError] = useState<Error | undefined>(undefined);

  const refresh = useCallback(async () => {
    try {
      setThreads(await fetchThreads(request));
      setError(undefined);
    } catch (cause) {
      setError(cause instanceof Error ? cause : new Error(String(cause)));
    }
  }, [request]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const rename = useCallback(
    async (id: string, title: string) => {
      await renameThread(request, id, title);
      await refresh();
    },
    [request, refresh],
  );

  const remove = useCallback(
    async (id: string) => {
      await deleteThread(request, id);
      await refresh();
    },
    [request, refresh],
  );

  return { threads, error, refresh, rename, remove };
}
