import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createTeamInvite,
  removeTeamMember,
  revokeTeamInvite,
  updateTeamInvite,
  updateTeamMember,
} from "../api";
import { teamKeys } from "./use-team";

export function useTeamActions() {
  const queryClient = useQueryClient();
  const reload = () => queryClient.invalidateQueries({ queryKey: teamKeys.all });

  const invite = useMutation({
    mutationFn: createTeamInvite,
    onSuccess: reload,
    meta: { successMessage: "Invite created" },
  });
  const changeInviteRole = useMutation({
    mutationFn: updateTeamInvite,
    onSuccess: reload,
    meta: { successMessage: "Invite updated" },
  });
  const revoke = useMutation({
    mutationFn: revokeTeamInvite,
    onSuccess: reload,
    meta: { successMessage: "Invite revoked" },
  });
  const changeRole = useMutation({
    mutationFn: updateTeamMember,
    onSuccess: reload,
    meta: { successMessage: "Role saved" },
  });
  const remove = useMutation({
    mutationFn: removeTeamMember,
    onSuccess: reload,
    meta: { successMessage: "Removed from the cafe" },
  });

  return { invite, changeInviteRole, revoke, changeRole, remove };
}
