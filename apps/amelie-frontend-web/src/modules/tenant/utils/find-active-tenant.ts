type TenantsList<TTenant extends { id: string }> = {
  tenants: Array<TTenant>;
  activeTenantId: string | null;
};

// -----
// The cafe the dashboard is working in, or
// null while nothing is loaded or chosen.
// -----
export function findActiveTenant<TTenant extends { id: string }>(
  list: TenantsList<TTenant> | undefined,
): TTenant | null {
  if (!list) return null;
  return list.tenants.find((tenant) => tenant.id === list.activeTenantId) ?? null;
}
