import {
  queryOptions,
  useQuery,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { fetchChatBotThread, fetchChatBotThreads } from "../api";
import type { ChatBotThreadsQuery } from "@repo/contracts/chat-bots";

export const chatBotKeys = {
  all: ["chat-bot"] as const,
  lists: () => [...chatBotKeys.all, "list"] as const,
  list: (query: ChatBotThreadsQuery = {}) =>
    [...chatBotKeys.lists(), query] as const,
  detail: (id: string) => [...chatBotKeys.all, "detail", id] as const,
};

export const chatBotQueries = {
  list: (query: ChatBotThreadsQuery = {}) =>
    queryOptions({
      queryKey: chatBotKeys.list(query),
      queryFn: () => fetchChatBotThreads({ data: query }),
      staleTime: 1000 * 30,
    }),
  detail: (id: string) =>
    queryOptions({
      queryKey: chatBotKeys.detail(id),
      queryFn: () => fetchChatBotThread({ data: { id } }),
      staleTime: 1000 * 30,
      retry: false,
    }),
};

export function useChatBotThreads(query: ChatBotThreadsQuery = {}) {
  return useQuery(chatBotQueries.list(query));
}

export function useSuspenseChatBotThreads(query: ChatBotThreadsQuery = {}) {
  return useSuspenseQuery(chatBotQueries.list(query));
}

export function useSuspenseChatBotThread(id: string) {
  return useSuspenseQuery(chatBotQueries.detail(id));
}
