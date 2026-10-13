import type { Location } from "@repo/contracts/amelie";

// -----
// The Locations still open, oldest first as the
// engine lists them. No data yet means none.
// -----
export const activeLocations = (locations: Location[] | undefined): Location[] =>
  (locations ?? []).filter((location) => location.archivedAt === null);
