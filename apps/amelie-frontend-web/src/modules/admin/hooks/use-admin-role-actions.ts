import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { CreateAdminRoleBody, UpdateAdminRoleBody } from "@repo/contracts/amelie";
import { teamKeys } from "#/modules/team";
import {
  createAdminRole,
  deleteAdminRole,
  setAdminRoleEnabled,
  setAdminRolePowers,
  updateAdminRole,
} from "../api";
import { adminKeys } from "./use-admin-access";

export function useAdminRoleActions() {
  const queryClient = useQueryClient();
  const reload = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: adminKeys.roles() }),
      queryClient.invalidateQueries({ queryKey: adminKeys.roleAudits() }),
      queryClient.invalidateQueries({ queryKey: teamKeys.roles }),
    ]);
  };

  const create = useMutation({
    mutationFn: (body: CreateAdminRoleBody) => createAdminRole({ data: body }),
    onSuccess: reload,
    meta: { successMessage: "Role created" },
  });

  const update = useMutation({
    mutationFn: (input: { roleId: string; body: UpdateAdminRoleBody }) => updateAdminRole({ data: input }),
    onSuccess: reload,
    meta: { successMessage: "Role saved" },
  });

  const setEnabled = useMutation({
    mutationFn: (input: { roleId: string; enabled: boolean }) => setAdminRoleEnabled({ data: { roleId: input.roleId, body: { enabled: input.enabled } } }),
    onSuccess: reload,
    meta: { successMessage: "Role updated" },
  });

  const setPowers = useMutation({
    mutationFn: (input: { roleId: string; powers: string[] }) => setAdminRolePowers({ data: { roleId: input.roleId, body: { powers: input.powers } } }),
    onSuccess: reload,
    meta: { successMessage: "Powers saved" },
  });

  const remove = useMutation({
    mutationFn: (roleId: string) => deleteAdminRole({ data: { roleId } }),
    onSuccess: reload,
    meta: { successMessage: "Role deleted" },
  });

  return { create, update, setEnabled, setPowers, remove };
}
