import type { MenuItem, MenuItemLocationsBody } from "@repo/contracts/amelie";

type SoldOutItem = Pick<MenuItem, "isAvailable" | "availableAtAllLocations" | "locationIds">;

export type MenuItemSoldOutChange =
  | { kind: "locations"; body: MenuItemLocationsBody }
  | { kind: "item"; isAvailable: boolean };

const listedAtOpen = (item: SoldOutItem, openLocationIds: string[]): string[] =>
  item.locationIds.filter((id) => openLocationIds.includes(id));

export const isMenuItemSoldOutHere = (item: SoldOutItem, locationId: string): boolean => {
  if (!item.isAvailable) return true;
  return item.availableAtAllLocations ? item.locationIds.includes(locationId) : !item.locationIds.includes(locationId);
};

export const toMenuItemSoldOutChange = (
  item: SoldOutItem,
  locationId: string | undefined,
  openLocationIds: string[],
): MenuItemSoldOutChange => {
  if (!locationId || openLocationIds.length <= 1) return { kind: "item", isAvailable: !item.isAvailable };
  if (!item.isAvailable) return { kind: "item", isAvailable: true };

  const listed = listedAtOpen(item, openLocationIds);
  const soldOutHere = isMenuItemSoldOutHere(item, locationId);
  if (item.availableAtAllLocations) {
    return {
      kind: "locations",
      body: {
        availableAtAllLocations: true,
        locationIds: soldOutHere ? listed.filter((id) => id !== locationId) : [...listed.filter((id) => id !== locationId), locationId],
      },
    };
  }

  const locationIds = soldOutHere
    ? [...listed.filter((id) => id !== locationId), locationId]
    : listed.filter((id) => id !== locationId);
  if (locationIds.length === 0) return { kind: "item", isAvailable: false };
  return { kind: "locations", body: { availableAtAllLocations: false, locationIds } };
};
