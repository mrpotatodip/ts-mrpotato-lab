import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";

import type { ChatBotThreadDetail, ChatBotThreadListItem } from "@repo/contracts/chat-bots";

import { restoreQueries, snapshotQueries } from "#/lib/optimistic-cache";
import { deleteChatBotThread, patchChatBotThreadTitle } from "../api";
import type { ChatBotTitleInput } from "../schemas";
import { withThreadRenamed, withThreadRenamedInList } from "../utils";
import { useChatBotRouteThreadId } from "./use-chat-bot-route-thread-id";
import { chatBotKeys } from "./use-chat-bot-threads";

// -----
// Leave /chat-bot/:threadId before dropping
// the detail query, or its loader 404s.
// -----
export function useChatBotThreadActions() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const routeThreadId = useChatBotRouteThreadId();

  const rename = useMutation({
    mutationFn: (input: ChatBotTitleInput) =>
      patchChatBotThreadTitle({ data: input }),
    onMutate: async ({ id, title }) => {
      const previous = await snapshotQueries<ChatBotThreadDetail | ChatBotThreadListItem[]>(
        queryClient,
        chatBotKeys.all,
      );
      queryClient.setQueryData<ChatBotThreadDetail>(chatBotKeys.detail(id), (detail) =>
        detail ? withThreadRenamed(detail, title) : detail,
      );
      queryClient.setQueriesData<ChatBotThreadListItem[]>({ queryKey: chatBotKeys.lists() }, (threads) =>
        threads ? withThreadRenamedInList(threads, id, title) : threads,
      );
      return { previous };
    },
    onError: (_error, _input, context) => restoreQueries(queryClient, context?.previous),
    onSuccess: (thread) => {
      // -----
      // Patch the title in place: a refetch would
      // re-hydrate and reset the open chat.
      // -----
      queryClient.setQueryData(chatBotKeys.detail(thread.id), (detail) =>
        detail ? { ...detail, title: thread.title } : detail,
      );
      void queryClient.invalidateQueries({ queryKey: chatBotKeys.lists() });
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteChatBotThread({ data: { id } }),
    onSuccess: async ({ id }) => {
      await queryClient.cancelQueries({ queryKey: chatBotKeys.detail(id) });
      if (routeThreadId === id) {
        await navigate({ to: "/chat-bot" });
      }
      queryClient.removeQueries({ queryKey: chatBotKeys.detail(id) });
      void queryClient.invalidateQueries({ queryKey: chatBotKeys.lists() });
    },
  });

  return { rename, remove };
}
