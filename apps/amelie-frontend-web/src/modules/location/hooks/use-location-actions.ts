import { useMutation, useQueryClient } from "@tanstack/react-query";
import { businessProfileKeys } from "#/modules/business-profile";
import { tenantHoursKeys } from "#/modules/schedule";
import {
  archiveLocation as archiveLocationRequest,
  createLocation as createLocationRequest,
  updateLocation as updateLocationRequest,
} from "../api";
import type { Location } from "@repo/contracts/amelie";
import type { LocationArchivedNotice } from "../schemas";
import { toArchivedNotice } from "../utils";
import { locationsKeys } from "./use-locations";

// -----
// Hours and contact details belong to a Location,
// so a change reloads them with the list.
// -----
export function useLocationActions() {
  const queryClient = useQueryClient();
  const invalidateLocationsAndTheirData = async () => {
    await queryClient.invalidateQueries({ queryKey: locationsKeys.all });
    void queryClient.invalidateQueries({ queryKey: tenantHoursKeys.all });
    void queryClient.invalidateQueries({ queryKey: businessProfileKeys.all });
  };

  const createLocation = useMutation({
    mutationFn: createLocationRequest,
    onSuccess: invalidateLocationsAndTheirData,
    meta: { successMessage: "Location added" },
  });
  const updateLocation = useMutation({
    mutationFn: updateLocationRequest,
    onSuccess: invalidateLocationsAndTheirData,
    meta: { successMessage: "Location saved" },
  });
  // -----
  // The notice is written here, not in the section:
  // reloading the profile unmounts the section
  // before a per-call callback would show it.
  // -----
  const archiveLocation = useMutation({
    mutationFn: archiveLocationRequest,
    meta: { successMessage: "Location archived" },
    onSuccess: async (archived) => {
      const known = queryClient.getQueryData<Location[]>(locationsKeys.all);
      queryClient.setQueryData<LocationArchivedNotice>(locationsKeys.archivedNotice, toArchivedNotice(known, archived));
      await invalidateLocationsAndTheirData();
    },
  });

  return { createLocation, updateLocation, archiveLocation };
}
