import { useSuspenseQuery } from "@tanstack/react-query";
import { adminQueries } from "./use-admin-access";

export function useSuspenseAdminRoles() {
  return useSuspenseQuery(adminQueries.roles());
}

export function useSuspenseAdminRole(roleId: string) {
  return useSuspenseQuery(adminQueries.role(roleId));
}

export function useSuspenseAdminRoleAudit(roleId: string) {
  return useSuspenseQuery(adminQueries.roleAudit(roleId));
}
