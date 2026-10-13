import type { MenuItem } from "@repo/contracts/amelie";

type LocationsControlContext = { hasSeveralLocations: boolean; soldNowhere: boolean };

// -----
// The Locations button shows when there is a
// choice to make, and always when the item has
// any availability setting, so the owner can see
// and clear one left behind by an archived Location.
// -----
export const showsMenuItemLocationsControl = (
  item: Pick<MenuItem, "availableAtAllLocations" | "locationIds">,
  { hasSeveralLocations, soldNowhere }: LocationsControlContext,
): boolean => hasSeveralLocations || soldNowhere || item.locationIds.length > 0 || !item.availableAtAllLocations;
