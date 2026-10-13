import { queryOptions, useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { fetchMenuImport, fetchMenuImports } from "../api";

export const menuImportsKeys = {
  all: ["menu-imports"] as const,
  detail: (importId: string) => [...menuImportsKeys.all, "detail", importId] as const,
};

const POLL_WHILE_RUNNING_MS = 3000;

export const menuImportsQueries = {
  list: () =>
    queryOptions({
      queryKey: menuImportsKeys.all,
      queryFn: () => fetchMenuImports(),
      staleTime: 1000 * 10,
      refetchInterval: (query) =>
        query.state.data?.some((item) => item.status === "running") ? POLL_WHILE_RUNNING_MS : false,
    }),
  detail: (importId: string) =>
    queryOptions({
      queryKey: menuImportsKeys.detail(importId),
      queryFn: () => fetchMenuImport({ data: { importId } }),
      staleTime: 1000 * 10,
      retry: false,
      refetchInterval: (query) => (query.state.data?.status === "running" ? POLL_WHILE_RUNNING_MS : false),
    }),
};

export function useMenuImports() {
  return useQuery(menuImportsQueries.list());
}

export function useSuspenseMenuImports() {
  return useSuspenseQuery(menuImportsQueries.list());
}

export function useMenuImport(importId: string) {
  return useQuery(menuImportsQueries.detail(importId));
}

export function useSuspenseMenuImport(importId: string) {
  return useSuspenseQuery(menuImportsQueries.detail(importId));
}
