import { useMutation, useQueryClient } from "@tanstack/react-query";
import { menuKeys } from "#/modules/menu";
import { updateTenantRegion } from "../api";
import type { UpdateTenantRegionInput } from "../schemas";
import { tenantsKeys } from "./use-tenants";

export function useTenantActions() {
  const queryClient = useQueryClient();

  const updateRegion = useMutation({
    mutationFn: (input: UpdateTenantRegionInput) => updateTenantRegion({ data: input }),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: tenantsKeys.all }),
        queryClient.invalidateQueries({ queryKey: menuKeys.all }),
      ]),
    meta: { successMessage: "Region saved" },
  });

  return { updateRegion };
}
