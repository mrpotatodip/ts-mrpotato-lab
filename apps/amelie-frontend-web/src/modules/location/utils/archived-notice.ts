import type { Location, LocationArchived } from "@repo/contracts/amelie";
import type { LocationArchivedNotice } from "../schemas";

// -----
// What the owner is told after archiving: which
// Location, and the items it left sold nowhere.
// -----
export const toArchivedNotice = (locations: Location[] | undefined, archived: LocationArchived): LocationArchivedNotice => ({
  name: locations?.find((location) => location.id === archived.id)?.name ?? "The location",
  unsoldMenuItems: archived.unsoldMenuItems,
});
