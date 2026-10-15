import { Suspense } from "react";
import type { Country, Location } from "@repo/contracts/amelie";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "#/components/ui/select";
import { countryLabel } from "#/modules/country";
import { useSuspenseDashboardScope } from "../hooks/use-dashboard-scope";

export type DashboardScopeControlsProps = {
  countries: Country[];
  locations: Location[];
  country: Country | undefined;
  location: Location | undefined;
  showCountryPicker: boolean;
  showLocationPicker: boolean;
  onSelectCountry: (countryId: string) => void;
  onSelectLocation: (locationId: string) => void;
};

export function DashboardScopePickers() {
  return (
    <Suspense fallback={null}>
      <DashboardScopePickersView />
    </Suspense>
  );
}

function DashboardScopePickersView() {
  const scope = useSuspenseDashboardScope();
  return (
    <DashboardScopeControls
      countries={scope.countries}
      locations={scope.locations}
      country={scope.country}
      location={scope.location}
      showCountryPicker={scope.showCountryPicker}
      showLocationPicker={scope.showLocationPicker}
      onSelectCountry={scope.selectCountry}
      onSelectLocation={scope.selectLocation}
    />
  );
}

export function DashboardScopeControls({
  countries,
  locations,
  country,
  location,
  showCountryPicker,
  showLocationPicker,
  onSelectCountry,
  onSelectLocation,
}: DashboardScopeControlsProps) {
  return (
    <>
      {showCountryPicker && country ? (
        <Select
          value={country.id}
          onValueChange={(countryId) => {
            if (countryId) onSelectCountry(countryId);
          }}
        >
          <SelectTrigger className="w-48" aria-label="Country">
            <SelectValue>{countryLabel(country)}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {countries.map((entry) => (
              <SelectItem key={entry.id} value={entry.id}>
                {countryLabel(entry)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : null}
      {showLocationPicker && location ? (
        <Select
          value={location.id}
          onValueChange={(locationId) => {
            if (locationId) onSelectLocation(locationId);
          }}
        >
          <SelectTrigger className="w-48" aria-label="Location">
            <SelectValue>{location.name}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {locations.map((entry) => (
              <SelectItem key={entry.id} value={entry.id}>
                {entry.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : null}
    </>
  );
}
