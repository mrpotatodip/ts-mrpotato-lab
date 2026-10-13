import type { Country } from "@repo/contracts/amelie";

// -----
// The Countries still open, oldest first as the
// engine lists them. No data yet means none.
// -----
export const activeCountries = (countries: Country[] | undefined): Country[] =>
  (countries ?? []).filter((country) => country.archivedAt === null);
