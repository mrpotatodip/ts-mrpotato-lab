import { queryOptions, useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { canEditCafe, hasAccessPower, type AccessPower } from "@repo/contracts/amelie";
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
// Powers come from the Role. canEdit/canManageTeam
// are derived for screens that still take a boolean.
// -----
export function useActiveTenantRole() {
  const { data } = useTenants();
  const active = findActiveTenant(data);
  const powers = active?.powers ?? [];
  return {
    role: active?.role ?? null,
    roleLabel: active?.roleLabel ?? null,
    powers,
    coverage: active?.coverage ?? "all",
    canEdit: canEditCafe(powers),
    canManageTeam: hasAccessPower(powers, "company:team:invites:create"),
    can: (power: AccessPower) => hasAccessPower(powers, power),
  };
}

export function useActiveTenant() {
  const { data } = useTenants();
  return findActiveTenant(data);
}
