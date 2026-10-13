import { queryOptions, useQuery } from "@tanstack/react-query";
import { fetchAdminAccess, fetchInviteCodes } from "../api";

export const adminKeys = {
  all: ["admin"] as const,
  access: () => [...adminKeys.all, "access"] as const,
  inviteCodes: () => [...adminKeys.all, "invite-codes"] as const,
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
};

// -----
// The sidebar reads this on every screen, so it
// stays a plain query: no suspending a layout.
// -----
export function useAdminAccess() {
  const { data } = useQuery(adminQueries.access());
  return { isSuperuser: data?.isSuperuser ?? false };
}
