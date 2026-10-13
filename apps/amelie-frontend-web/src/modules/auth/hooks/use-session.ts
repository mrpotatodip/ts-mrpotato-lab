import { queryOptions, useQuery } from "@tanstack/react-query";
import { getSession } from "../api";

export const sessionKeys = {
  all: ["session"] as const,
};

export const sessionQueries = {
  current: () =>
    queryOptions({
      queryKey: sessionKeys.all,
      queryFn: () => getSession(),
      staleTime: 1000 * 60,
    }),
};

export function useSession() {
  return useQuery(sessionQueries.current());
}
