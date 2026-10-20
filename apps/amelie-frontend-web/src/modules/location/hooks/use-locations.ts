import { queryOptions, skipToken, useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useActiveTenantRole } from "#/modules/tenant/hooks/use-tenants";
import { fetchLocationArchivePreview, fetchLocations } from "../api";
import type { LocationArchivedNotice } from "../schemas";
import { coveredLocations } from "../utils/covered-locations";

// -----
// The notice has its own root, so reloading the
// list does not touch it.
// -----
export const locationsKeys = {
  all: ["locations"] as const,
  archivedNotice: ["location-archived-notice"] as const,
  archivePreview: (locationId: string) => ["location-archive-preview", locationId] as const,
};

export const locationsQueries = {
  list: () =>
    queryOptions({
      queryKey: locationsKeys.all,
      queryFn: () => fetchLocations(),
      staleTime: 1000 * 30,
    }),
  // -----
  archivePreview: (locationId: string) =>
    queryOptions({
      queryKey: locationsKeys.archivePreview(locationId),
      queryFn: () => fetchLocationArchivePreview({ data: { locationId } }),
      staleTime: 0,
      gcTime: 0,
    }),
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
  const { coverage } = useActiveTenantRole();
  return useQuery({ ...locationsQueries.list(), select: (all) => coveredLocations(all, coverage) });
}

export function useSuspenseLocations() {
  const { coverage } = useActiveTenantRole();
  return useSuspenseQuery({ ...locationsQueries.list(), select: (all) => coveredLocations(all, coverage) });
}

export function useAllLocations() {
  return useSuspenseQuery(locationsQueries.list());
}

export function useLocationArchivePreview(locationId: string | null) {
  const { data } = useQuery({
    ...locationsQueries.archivePreview(locationId ?? ""),
    enabled: locationId !== null,
  });
  return data?.membersWithoutLocation;
}

export function useLocationArchivedNotice() {
  const { data } = useQuery(locationsQueries.archivedNotice());
  const queryClient = useQueryClient();
  const dismiss = () => queryClient.setQueryData<LocationArchivedNotice | null>(locationsKeys.archivedNotice, null);
  return { notice: data ?? null, dismiss };
}
