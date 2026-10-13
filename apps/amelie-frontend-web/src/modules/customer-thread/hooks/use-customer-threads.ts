import { queryOptions, useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { fetchCustomerThread, fetchCustomerThreads } from "../api";

export const customerThreadsKeys = {
  all: ["customer-threads"] as const,
  detail: (threadId: string) => ["customer-threads", threadId] as const,
};

export const customerThreadsQueries = {
  list: () =>
    queryOptions({
      queryKey: customerThreadsKeys.all,
      queryFn: () => fetchCustomerThreads(),
      staleTime: 1000 * 30,
    }),
  detail: (threadId: string) =>
    queryOptions({
      queryKey: customerThreadsKeys.detail(threadId),
      queryFn: () => fetchCustomerThread({ data: { threadId } }),
      staleTime: 1000 * 30,
      retry: false,
    }),
};

export function useCustomerThreads() {
  return useQuery(customerThreadsQueries.list());
}

export function useSuspenseCustomerThreads() {
  return useSuspenseQuery(customerThreadsQueries.list());
}

export function useCustomerThread(threadId: string) {
  return useQuery(customerThreadsQueries.detail(threadId));
}

export function useSuspenseCustomerThread(threadId: string) {
  return useSuspenseQuery(customerThreadsQueries.detail(threadId));
}
