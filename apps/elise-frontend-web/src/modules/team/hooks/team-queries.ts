import { queryOptions } from "@tanstack/react-query";
import { fetchGroups, fetchTeam, fetchTeamRoles, previewTeamInvite } from "../api";

export const teamKeys = {
  all: ["team"] as const,
  members: () => [...teamKeys.all, "members"] as const,
  roles: () => [...teamKeys.all, "roles"] as const,
  groups: () => [...teamKeys.all, "groups"] as const,
  invite: (token: string) => [...teamKeys.all, "invite", token] as const,
};

export const teamQuery = () => queryOptions({ queryKey: teamKeys.members(), queryFn: () => fetchTeam() });

export const teamRolesQuery = () => queryOptions({ queryKey: teamKeys.roles(), queryFn: () => fetchTeamRoles(), staleTime: Infinity });

export const groupsQuery = () => queryOptions({ queryKey: teamKeys.groups(), queryFn: () => fetchGroups() });

export const inviteQuery = (token: string) => queryOptions({ queryKey: teamKeys.invite(token), queryFn: () => previewTeamInvite({ data: { token } }), retry: false });
