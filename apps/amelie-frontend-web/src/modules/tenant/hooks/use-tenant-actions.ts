import { useMutation, useQueryClient } from "@tanstack/react-query";
import { menuKeys } from "#/modules/menu";
import { updateTenantAllowedOrigins, updateTenantRegion } from "../api";
import type { UpdateTenantAllowedOriginsInput, UpdateTenantRegionInput } from "../schemas";
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

  const updateAllowedOrigins = useMutation({
    mutationFn: (input: UpdateTenantAllowedOriginsInput) => updateTenantAllowedOrigins({ data: input }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: tenantsKeys.all }),
  });

  return { updateRegion, updateAllowedOrigins };
}
