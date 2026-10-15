import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { UpdateBusinessProfileBody } from "@repo/contracts/amelie";
import { updateBusinessProfile } from "../api";
import { businessProfileKeys } from "./use-business-profile";

export function useBusinessProfileActions(locationId?: string) {
  const queryClient = useQueryClient();

  const save = useMutation({
    mutationFn: (body: UpdateBusinessProfileBody) => updateBusinessProfile({ data: { ...body, locationId } }),
    onSuccess: (profile) => queryClient.setQueryData(businessProfileKeys.detail(locationId), profile),
    meta: { successMessage: "Profile saved" },
  });

  return { save };
}
