import { useMutation, useQueryClient } from "@tanstack/react-query";
import { locationsKeys } from "#/modules/location";
import { menuKeys } from "#/modules/menu";
import { tenantsKeys } from "#/modules/tenant";
import {
  archiveCountry as archiveCountryRequest,
  createCountry as createCountryRequest,
  updateCountry as updateCountryRequest,
} from "../api";
import { countriesKeys } from "./use-countries";

// -----
// The cafe's region is its first open Country, the
// menu is priced per Country, and Locations belong to
// one, so a change reloads all of them with the list.
// -----
export function useCountryActions() {
  const queryClient = useQueryClient();
  const reload = async () => {
    await queryClient.invalidateQueries({ queryKey: countriesKeys.all });
    void queryClient.invalidateQueries({ queryKey: tenantsKeys.all });
    void queryClient.invalidateQueries({ queryKey: menuKeys.all });
    void queryClient.invalidateQueries({ queryKey: locationsKeys.all });
  };

  const createCountry = useMutation({ mutationFn: createCountryRequest, onSuccess: reload, meta: { successMessage: "Country added" } });
  const updateCountry = useMutation({ mutationFn: updateCountryRequest, onSuccess: reload, meta: { successMessage: "Country saved" } });
  const archiveCountry = useMutation({ mutationFn: archiveCountryRequest, onSuccess: reload, meta: { successMessage: "Country archived" } });

  return { createCountry, updateCountry, archiveCountry };
}
