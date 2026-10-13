import type { Country } from "@repo/contracts/amelie";
import { COUNTRY_OPTIONS } from "#/modules/shared";

// -----
// The countries a cafe can still add: every one it
// does not sell in now. An archived one is offered
// too; adding it brings back its prices.
// -----
export const addableCountryOptions = (countries: Country[]): typeof COUNTRY_OPTIONS => {
  const open = new Set(countries.filter((country) => country.archivedAt === null).map((country) => country.country));
  return COUNTRY_OPTIONS.filter((option) => !open.has(option.code));
};
