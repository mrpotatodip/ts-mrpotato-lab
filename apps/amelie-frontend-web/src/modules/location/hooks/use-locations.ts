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
  // Who an archive would leave with no open Location. Always
  // fresh: Bindings change without this screen knowing.
  // -----
  archivePreview: (locationId: string) =>
    queryOptions({
      queryKey: locationsKeys.archivePreview(locationId),
      queryFn: () => fetchLocationArchivePreview({ data: { locationId } }),
      staleTime: 0,
      gcTime: 0,
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

// -----
// The Locations the signed-in member's Role covers. The
// unfiltered list stays in the cache for the screens that
// need to see a Location they cannot use.
// -----
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

// -----
// Only asked while a Location waits for the archive
// confirmation; undefined until the answer arrives.
// -----
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
