import { queryOptions, skipToken, useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { fetchLocations } from "../api";
import type { LocationArchivedNotice } from "../schemas";

// -----
// The notice has its own root, so reloading the
// list does not touch it.
// -----
export const locationsKeys = {
  all: ["locations"] as const,
  archivedNotice: ["location-archived-notice"] as const,
};

export const locationsQueries = {
  list: () =>
    queryOptions({
      queryKey: locationsKeys.all,
      queryFn: () => fetchLocations(),
      staleTime: 1000 * 30,
    }),
  // -----
  // Never fetched: it only holds what an archive
  // left behind, until it is dismissed.
  // -----
  archivedNotice: () =>
    queryOptions<LocationArchivedNotice | null>({
      queryKey: locationsKeys.archivedNotice,
      queryFn: skipToken,
      staleTime: Infinity,
      gcTime: Infinity,
    }),
};

export function useLocations() {
  return useQuery(locationsQueries.list());
}

export function useSuspenseLocations() {
  return useSuspenseQuery(locationsQueries.list());
}

export function useLocationArchivedNotice() {
  const { data } = useQuery(locationsQueries.archivedNotice());
  const queryClient = useQueryClient();
  const dismiss = () => queryClient.setQueryData<LocationArchivedNotice | null>(locationsKeys.archivedNotice, null);
  return { notice: data ?? null, dismiss };
}
