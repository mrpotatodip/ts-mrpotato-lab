import { covers, type Coverage, type Location } from "@repo/contracts/amelie";

export const coveredLocations = (locations: Location[] | undefined, coverage: Coverage): Location[] =>
  (locations ?? []).filter((location) => covers(coverage, [location.id]));
