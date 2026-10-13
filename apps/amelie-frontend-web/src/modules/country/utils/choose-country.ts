import type { Country } from "@repo/contracts/amelie";

// -----
// Which Country a screen shows. With one open
// Country there is nothing to choose and the engine
// uses it, so nothing is picked. With several, the
// pick, or the oldest if it is gone or archived.
// -----
export const chooseCountry = (active: Country[], pickedId: string | null): Country | undefined =>
  active.length > 1 ? (active.find((country) => country.id === pickedId) ?? active[0]) : undefined;
