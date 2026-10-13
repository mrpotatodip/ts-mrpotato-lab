import type { MenuItem } from "@repo/contracts/amelie";

// -----
// ADR-0001: an item is sold at the Locations
// listed when it is not an all-Locations item,
// and at every Location except those listed
// when it is. It is sold nowhere when no open
// Location is left that sells it.
// -----
export const isMenuItemSoldNowhere = (
  item: Pick<MenuItem, "availableAtAllLocations" | "locationIds">,
  openLocationIds: string[],
): boolean => {
  const listed = new Set(item.locationIds);
  return item.availableAtAllLocations
    ? openLocationIds.every((id) => listed.has(id))
    : !openLocationIds.some((id) => listed.has(id));
};
