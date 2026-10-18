import { startTransition, useEffect, useSyncExternalStore } from "react";

import { useSuspenseCountries } from "#/modules/country";
import { useAllLocations } from "#/modules/location";
import { useActiveTenant, useActiveTenantRole } from "#/modules/tenant";
import {
  getDashboardScopeServerSnapshot,
  readDashboardScope,
  resolveDashboardScope,
  subscribeDashboardScope,
  writeDashboardScope,
} from "../utils";

export function useSuspenseDashboardScope() {
  const tenant = useActiveTenant();
  const { coverage } = useActiveTenantRole();
  const tenantId = tenant?.id ?? "";
  const { data: countries } = useSuspenseCountries();
  const { data: locations } = useAllLocations();
  const stored = useSyncExternalStore(
    subscribeDashboardScope,
    () => readDashboardScope(tenantId),
    getDashboardScopeServerSnapshot,
  );
  const scope = resolveDashboardScope(countries, locations, stored, coverage);

  useEffect(() => {
    if (!tenantId || scope.notCovered) return;
    const next = { countryId: scope.country?.id ?? null, locationId: scope.location?.id ?? null };
    if (next.countryId === stored.countryId && next.locationId === stored.locationId) return;
    writeDashboardScope(tenantId, next);
  }, [tenantId, scope.notCovered, scope.country?.id, scope.location?.id, stored.countryId, stored.locationId]);

  return {
    ...scope,
    selectCountry: (countryId: string) => {
      startTransition(() => writeDashboardScope(tenantId, { countryId, locationId: null }));
    },
    selectLocation: (locationId: string) => {
      const location = locations.find((entry) => entry.id === locationId);
      startTransition(() =>
        writeDashboardScope(tenantId, { countryId: location?.countryId ?? null, locationId }),
      );
    },
  };
}
