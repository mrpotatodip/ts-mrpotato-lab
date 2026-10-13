import { queryOptions, useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { fetchTenantHours } from "../api";
import { TENANT_HOURS_ONLY_LOCATION_KEY } from "../constants";

export const tenantHoursKeys = {
  all: ["tenant-hours"] as const,
  detail: (locationId: string | undefined) =>
    [...tenantHoursKeys.all, locationId ?? TENANT_HOURS_ONLY_LOCATION_KEY] as const,
};

export const tenantHoursQueries = {
  detail: (locationId?: string) =>
    queryOptions({
      queryKey: tenantHoursKeys.detail(locationId),
      queryFn: () => fetchTenantHours({ data: { locationId } }),
      staleTime: 1000 * 30,
    }),
};

export function useTenantHours(locationId?: string, enabled = true) {
  return useQuery({ ...tenantHoursQueries.detail(locationId), enabled });
}

export function useSuspenseTenantHours(locationId?: string) {
  return useSuspenseQuery(tenantHoursQueries.detail(locationId));
}
