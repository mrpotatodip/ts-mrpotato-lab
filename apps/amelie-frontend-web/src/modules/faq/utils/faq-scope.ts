import type { Country, Faq, Location } from "@repo/contracts/amelie";
import { countryName } from "#/modules/shared";

// -----
// The select needs one real value for each choice:
// all locations, one Country, or one Location.
// -----
export const ALL_LOCATIONS = "all-locations";
const COUNTRY_PREFIX = "country:";

export type FaqScopeOption = { value: string; label: string };

export const faqScopeOptions = (locations: Location[], countries: Country[]): FaqScopeOption[] => [
  { value: ALL_LOCATIONS, label: "All locations" },
  ...(countries.length > 1
    ? countries.map((country) => ({
        value: `${COUNTRY_PREFIX}${country.id}`,
        label: `${countryName(country.country)} (all locations)`,
      }))
    : []),
  ...locations.map((location) => ({ value: location.id, label: `${location.name} only` })),
];

export const toScopeValue = (faq: Pick<Faq, "locationId" | "countryId"> | null): string => {
  if (faq?.countryId) return `${COUNTRY_PREFIX}${faq.countryId}`;
  return faq?.locationId ?? ALL_LOCATIONS;
};

// -----
// At most one of the two is set, so a body built
// from this never trips the engine's rule.
// -----
export type FaqScopeFields = { countryId: string | null; locationId: string | null };

export const fromScopeValue = (value: string): FaqScopeFields => {
  if (value === ALL_LOCATIONS) return { countryId: null, locationId: null };
  if (value.startsWith(COUNTRY_PREFIX)) return { countryId: value.slice(COUNTRY_PREFIX.length), locationId: null };
  return { countryId: null, locationId: value };
};

export const faqScopeLabel = (value: string, options: FaqScopeOption[]): string =>
  options.find((option) => option.value === value)?.label ?? "A closed location or country";

// -----
// A Country FAQ is always badged. A Location FAQ is
// badged only when the café has several Locations.
// -----
export const faqBadgeLabel = (
  faq: Pick<Faq, "locationId" | "countryId">,
  locations: Location[],
  countries: Country[],
): string | null => {
  if (faq.countryId) {
    const country = countries.find((candidate) => candidate.id === faq.countryId);
    return `${country ? countryName(country.country) : "A closed country"} only`;
  }
  if (locations.length > 1 && faq.locationId) {
    return `${locations.find((location) => location.id === faq.locationId)?.name ?? "A closed location"} only`;
  }
  return null;
};
