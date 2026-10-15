import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { TenantHours } from "@repo/contracts/amelie";
import { optimisticEdit } from "#/lib/optimistic-cache";
import { removeSpecialDate, setSpecialDate, setWeeklyHours } from "../api";
import type { RemoveSpecialDateInput, SetSpecialDateInput, SetWeeklyHoursInput } from "../schemas";
import type { ForLocation } from "../types";
import { withoutSpecialDate } from "../utils";
import { tenantHoursKeys } from "./use-tenant-hours";

// -----
// A save changes what the weekly list and the
// special dates show, so both reload together.
// The Location being edited is added here, so the
// rows only say what changed.
// -----
export function useTenantHoursActions(locationId?: string) {
  const queryClient = useQueryClient();
  const reload = () => queryClient.invalidateQueries({ queryKey: tenantHoursKeys.all });

  const saveWeekday = useMutation({
    mutationFn: ({ data }: ForLocation<SetWeeklyHoursInput>) => setWeeklyHours({ data: { ...data, locationId } }),
    onSuccess: reload,
    meta: { successMessage: "Hours saved" },
  });
  const saveSpecialDate = useMutation({
    mutationFn: ({ data }: ForLocation<SetSpecialDateInput>) => setSpecialDate({ data: { ...data, locationId } }),
    onSuccess: reload,
    meta: { successMessage: "Special date saved" },
  });
  const removeDate = useMutation(
    optimisticEdit({
      queryClient,
      queryKey: tenantHoursKeys.detail(locationId),
      mutationFn: ({ data }: ForLocation<RemoveSpecialDateInput>) => removeSpecialDate({ data: { ...data, locationId } }),
      applyEdit: (hours: TenantHours, { data }) => withoutSpecialDate(hours, data.date),
      settle: reload,
      meta: { successMessage: "Special date removed" },
    }),
  );

  return { saveWeekday, saveSpecialDate, removeDate };
}
