import { useMutation, useQueryClient } from "@tanstack/react-query";
import { switchTenant } from "../api";

// -----
// Every list belongs to the old cafe, so all
// of them reload for the new one.
// -----
export function useSwitchTenant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (tenantId: string) => switchTenant({ data: { tenantId } }),
    onSuccess: () => queryClient.invalidateQueries(),
    meta: { successMessage: "Cafe switched" },
  });
}
