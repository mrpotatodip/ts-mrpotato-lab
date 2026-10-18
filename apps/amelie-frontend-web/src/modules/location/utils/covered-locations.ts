import { covers, type Coverage, type Location } from "@repo/contracts/amelie";

// -----
// The Locations a member's bindings cover. This only
// hides: the server refuses the rest with a 403.
// -----
export const coveredLocations = (locations: Location[] | undefined, coverage: Coverage): Location[] =>
  (locations ?? []).filter((location) => covers(coverage, [location.id]));
