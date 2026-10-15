import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { CreateInviteCodeBody, InviteCode } from "@repo/contracts/amelie";
import { optimisticEdit } from "#/lib/optimistic-cache";
import { createInviteCode, revokeInviteCode } from "../api";
import { withInviteCodeRevoked } from "../utils";
import { adminKeys } from "./use-admin-access";

export function useInviteCodeActions() {
  const queryClient = useQueryClient();
  const refreshList = () => queryClient.invalidateQueries({ queryKey: adminKeys.inviteCodes() });

  // -----
  // gcTime 0: the result holds the plain code, so
  // the mutation cache must not keep it around.
  // -----
  const create = useMutation({
    mutationFn: (body: Partial<CreateInviteCodeBody>) => createInviteCode({ data: body }),
    gcTime: 0,
    onSuccess: refreshList,
    meta: { successMessage: "Invite code created" },
  });

  const revoke = useMutation(
    optimisticEdit({
      queryClient,
      queryKey: adminKeys.inviteCodes(),
      mutationFn: (id: string) => revokeInviteCode({ data: { id } }),
      applyEdit: (codes: InviteCode[], id) => withInviteCodeRevoked(codes, id, new Date()),
      settle: refreshList,
      meta: { successMessage: "Invite code revoked" },
    }),
  );

  return { create, revoke };
}
