import type { Location } from "@repo/contracts/amelie";

// -----
// How many open Locations a Country has: a Country
// with any cannot be archived.
// -----
export const countOpenLocationsIn = (locations: Location[] | undefined, countryId: string): number =>
  (locations ?? []).filter((location) => location.countryId === countryId && location.archivedAt === null).length;
