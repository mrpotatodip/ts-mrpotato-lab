import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { adminQueries } from "./use-admin-access";

export function useInviteCodes() {
  return useQuery(adminQueries.inviteCodes());
}

export function useSuspenseInviteCodes() {
  return useSuspenseQuery(adminQueries.inviteCodes());
}
