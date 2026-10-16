import { queryOptions, useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { fetchTeam, fetchTeamRoles } from "../api";

export const teamKeys = {
  all: ["team"] as const,
  roles: ["team", "roles"] as const,
};

export const teamQueries = {
  list: () =>
    queryOptions({
      queryKey: teamKeys.all,
      queryFn: () => fetchTeam(),
      staleTime: 1000 * 30,
    }),
  roles: () =>
    queryOptions({
      queryKey: teamKeys.roles,
      queryFn: () => fetchTeamRoles(),
      staleTime: 1000 * 30,
    }),
};

export function useTeam() {
  return useQuery(teamQueries.list());
}

export function useSuspenseTeam() {
  return useSuspenseQuery(teamQueries.list());
}

export function useSuspenseTeamRoles() {
  return useSuspenseQuery(teamQueries.roles());
}
