import type { Country, Location } from "@repo/contracts/amelie";

import { activeCountries } from "#/modules/country";
import { activeLocations } from "#/modules/location";

export type StoredDashboardPick = {
  countryId: string | null;
  locationId: string | null;
};

export type DashboardScope = {
  countries: Country[];
  locations: Location[];
  country: Country | undefined;
  location: Location | undefined;
  countryId: string | undefined;
  locationId: string | undefined;
  emptyPlace: boolean;
  showCountryPicker: boolean;
  showLocationPicker: boolean;
};

export const EMPTY_STORED_PICK: StoredDashboardPick = { countryId: null, locationId: null };

export function resolveDashboardScope(
  countries: Country[] | undefined,
  locations: Location[] | undefined,
  stored: StoredDashboardPick,
): DashboardScope {
  const openCountries = activeCountries(countries);
  const openLocations = activeLocations(locations);
  const country = openCountries.find((entry) => entry.id === stored.countryId) ?? openCountries[0];
  const locationsInCountry = country ? openLocations.filter((entry) => entry.countryId === country.id) : [];
  const location = locationsInCountry.find((entry) => entry.id === stored.locationId) ?? locationsInCountry[0];
  const emptyPlace = country !== undefined && locationsInCountry.length === 0;

  return {
    countries: openCountries,
    locations: locationsInCountry,
    country,
    location,
    countryId: openCountries.length > 1 ? country?.id : undefined,
    locationId: emptyPlace || openLocations.length <= 1 ? undefined : location?.id,
    emptyPlace,
    showCountryPicker: openCountries.length > 1,
    showLocationPicker: locationsInCountry.length > 1,
  };
}
