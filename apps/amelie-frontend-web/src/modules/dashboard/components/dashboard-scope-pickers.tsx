import { Suspense } from "react";
import type { Country, Location } from "@repo/contracts/amelie";

import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "#/components/ui/select";
import { countryLabel } from "#/modules/country";
import { useSuspenseDashboardScope } from "../hooks/use-dashboard-scope";

const EMPTY_COUNTRY_PREFIX = "country:";

export type DashboardScopeControlsProps = {
  countries: Country[];
  locations: Location[];
  country: Country | undefined;
  location: Location | undefined;
  emptyPlace: boolean;
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
      locations={scope.openLocations}
      country={scope.country}
      location={scope.location}
      emptyPlace={scope.emptyPlace}
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
  emptyPlace,
  showCountryPicker,
  showLocationPicker,
  onSelectCountry,
  onSelectLocation,
}: DashboardScopeControlsProps) {
  if (!showCountryPicker && !showLocationPicker) return null;

  const value = location ? location.id : emptyPlace && country ? `${EMPTY_COUNTRY_PREFIX}${country.id}` : undefined;
  const primary = location?.name ?? (country ? countryLabel(country) : "");
  const secondary = location && showCountryPicker ? countryLabel(country) : emptyPlace ? "No location yet" : null;
  const label = showCountryPicker ? (showLocationPicker || locations.length > 0 ? "Country and location" : "Country") : "Location";

  return (
    <Select
      value={value}
      onValueChange={(next) => {
        if (!next) return;
        if (next.startsWith(EMPTY_COUNTRY_PREFIX)) {
          onSelectCountry(next.slice(EMPTY_COUNTRY_PREFIX.length));
          return;
        }
        onSelectLocation(next);
      }}
    >
      <SelectTrigger className="h-auto w-full py-2 [&>span]:line-clamp-none" aria-label={label}>
        <SelectValue>
          <span className="flex min-w-0 flex-col items-start text-left">
            <span className="truncate">{primary}</span>
            {secondary ? <span className="text-muted-foreground truncate text-xs font-normal">{secondary}</span> : null}
          </span>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {showCountryPicker
          ? countries.map((entry) => {
              const places = locations.filter((place) => place.countryId === entry.id);
              return (
                <SelectGroup key={entry.id}>
                  {places.length > 0 ? <SelectLabel>{countryLabel(entry)}</SelectLabel> : null}
                  {places.length === 0 ? (
                    <SelectItem value={`${EMPTY_COUNTRY_PREFIX}${entry.id}`}>{countryLabel(entry)}</SelectItem>
                  ) : (
                    places.map((place) => (
                      <SelectItem key={place.id} value={place.id}>
                        {place.name}
                      </SelectItem>
                    ))
                  )}
                </SelectGroup>
              );
            })
          : locations.map((place) => (
              <SelectItem key={place.id} value={place.id}>
                {place.name}
              </SelectItem>
            ))}
      </SelectContent>
    </Select>
  );
}
