import { queryOptions, useQuery, type QueryClient } from "@tanstack/react-query";
import { getSession } from "../api";

export const sessionKeys = {
  all: ["session"] as const,
};

export const sessionQueries = {
  current: () =>
    queryOptions({
      queryKey: sessionKeys.all,
      queryFn: () => getSession(),
      staleTime: 1000 * 60 * 5,
    }),
};

export function loadSession(queryClient: QueryClient) {
  return queryClient.query(sessionQueries.current());
}

export function useSession() {
  return useQuery(sessionQueries.current());
}
