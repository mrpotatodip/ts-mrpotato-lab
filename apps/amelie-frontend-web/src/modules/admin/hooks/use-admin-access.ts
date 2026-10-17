import { queryOptions, useQuery } from "@tanstack/react-query";
import { fetchAdminAccess, fetchAdminRole, fetchAdminRoleAuditLog, fetchAdminRoles, fetchInviteCodes } from "../api";

export const adminKeys = {
  all: ["admin"] as const,
  access: () => [...adminKeys.all, "access"] as const,
  inviteCodes: () => [...adminKeys.all, "invite-codes"] as const,
  roles: () => [...adminKeys.all, "roles"] as const,
  role: (roleId: string) => [...adminKeys.roles(), roleId] as const,
  roleAudits: () => [...adminKeys.all, "role-audit"] as const,
  roleAudit: (roleId: string) => [...adminKeys.roleAudits(), roleId] as const,
};

export const adminQueries = {
  access: () =>
    queryOptions({
      queryKey: adminKeys.access(),
      queryFn: () => fetchAdminAccess(),
      staleTime: 1000 * 60,
    }),
  inviteCodes: () =>
    queryOptions({
      queryKey: adminKeys.inviteCodes(),
      queryFn: () => fetchInviteCodes(),
    }),
  roles: () =>
    queryOptions({
      queryKey: adminKeys.roles(),
      queryFn: () => fetchAdminRoles(),
    }),
  role: (roleId: string) =>
    queryOptions({
      queryKey: adminKeys.role(roleId),
      queryFn: () => fetchAdminRole({ data: { roleId } }),
    }),
  roleAudit: (roleId: string) =>
    queryOptions({
      queryKey: adminKeys.roleAudit(roleId),
      queryFn: () => fetchAdminRoleAuditLog({ data: { roleId } }),
    }),
};

// -----
// The sidebar reads this on every screen, so it
// stays a plain query: no suspending a layout.
// -----
export function useAdminAccess() {
  const { data } = useQuery(adminQueries.access());
  return { isSuperuser: data?.isSuperuser ?? false };
}
