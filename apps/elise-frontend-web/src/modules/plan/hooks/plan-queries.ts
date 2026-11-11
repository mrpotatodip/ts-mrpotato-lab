import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";
import { fetchCreditEntries, fetchPlan } from "../api";

export const planKeys = {
  all: ["plan"] as const,
  details: () => [...planKeys.all, "details"] as const,
  entries: () => [...planKeys.all, "entries"] as const,
};

export const planQuery = () =>
  queryOptions({
    queryKey: planKeys.details(),
    queryFn: () => fetchPlan(),
  });

export const creditEntriesQuery = () =>
  infiniteQueryOptions({
    queryKey: planKeys.entries(),
    queryFn: ({ pageParam }) => fetchCreditEntries({ data: { cursor: pageParam === "" ? undefined : pageParam } }),
    initialPageParam: "",
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
