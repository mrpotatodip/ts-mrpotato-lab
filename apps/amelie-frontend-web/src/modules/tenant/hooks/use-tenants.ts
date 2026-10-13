import { queryOptions, useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { fetchTenants } from "../api";
import { findActiveTenant } from "../utils";

export const tenantsKeys = {
  all: ["tenants"] as const,
};

export const tenantsQueries = {
  list: () =>
    queryOptions({
      queryKey: tenantsKeys.all,
      queryFn: () => fetchTenants(),
      staleTime: 1000 * 60,
    }),
};

export function useTenants() {
  return useQuery(tenantsQueries.list());
}

export function useSuspenseTenants() {
  return useSuspenseQuery(tenantsQueries.list());
}

// -----
// A Role with can_edit changes a cafe's data;
// any other Role only reads it.
// -----
export function useActiveTenantRole() {
  const { data } = useTenants();
  const active = findActiveTenant(data);
  return { role: active?.role ?? null, canEdit: active?.canEdit ?? false };
}

export function useActiveTenant() {
  const { data } = useTenants();
  return findActiveTenant(data);
}
