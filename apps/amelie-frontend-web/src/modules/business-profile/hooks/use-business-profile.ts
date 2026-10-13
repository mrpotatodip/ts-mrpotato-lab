import { queryOptions, useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { fetchBusinessProfile } from "../api";

export const businessProfileKeys = {
  all: ["business-profile"] as const,
  detail: (locationId: string | undefined) => [...businessProfileKeys.all, locationId ?? "only"] as const,
};

export const businessProfileQueries = {
  detail: (locationId?: string) =>
    queryOptions({
      queryKey: businessProfileKeys.detail(locationId),
      queryFn: () => fetchBusinessProfile({ data: { locationId } }),
      staleTime: 1000 * 30,
    }),
};

export function useBusinessProfile(locationId?: string, enabled = true) {
  return useQuery({ ...businessProfileQueries.detail(locationId), enabled });
}

export function useSuspenseBusinessProfile(locationId?: string) {
  return useSuspenseQuery(businessProfileQueries.detail(locationId));
}
