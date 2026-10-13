import { describe, expect, it } from "vitest";
import { showsMenuItemLocationsControl } from "../menu-item-locations-control";

const ARCHIVED = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

const noIds: string[] = [];
const base = { availableAtAllLocations: true, locationIds: noIds };

describe("showsMenuItemLocationsControl", () => {
  it("is hidden for a plain item at a one-Location cafe", () => {
    expect(showsMenuItemLocationsControl(base, { hasSeveralLocations: false, soldNowhere: false })).toBe(false);
  });

  it("is shown with several Locations", () => {
    expect(showsMenuItemLocationsControl(base, { hasSeveralLocations: true, soldNowhere: false })).toBe(true);
  });

  it("is shown when the item is sold nowhere", () => {
    expect(showsMenuItemLocationsControl(base, { hasSeveralLocations: false, soldNowhere: true })).toBe(true);
  });

  it("is shown for a row left behind by an archived Location", () => {
    const item = { availableAtAllLocations: true, locationIds: [ARCHIVED] };
    expect(showsMenuItemLocationsControl(item, { hasSeveralLocations: false, soldNowhere: false })).toBe(true);
  });

  it("is shown for an item that is not an all-Locations item", () => {
    const item = { availableAtAllLocations: false, locationIds: [] };
    expect(showsMenuItemLocationsControl(item, { hasSeveralLocations: false, soldNowhere: false })).toBe(true);
  });
});
