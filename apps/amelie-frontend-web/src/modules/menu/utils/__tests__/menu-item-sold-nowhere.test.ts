import { describe, expect, it } from "vitest";
import { isMenuItemSoldNowhere } from "../menu-item-sold-nowhere";

const A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const ARCHIVED = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

describe("isMenuItemSoldNowhere", () => {
  it("is true when the only Locations that sell the item are archived", () => {
    expect(isMenuItemSoldNowhere({ availableAtAllLocations: false, locationIds: [ARCHIVED] }, [A, B])).toBe(true);
  });

  it("is false while any open Location sells it", () => {
    expect(isMenuItemSoldNowhere({ availableAtAllLocations: false, locationIds: [ARCHIVED, B] }, [A, B])).toBe(false);
  });

  it("is true for an item that sells at no Location at all", () => {
    expect(isMenuItemSoldNowhere({ availableAtAllLocations: false, locationIds: [] }, [A])).toBe(true);
  });

  it("is false for an all-Locations item unless it is sold out at every open Location", () => {
    expect(isMenuItemSoldNowhere({ availableAtAllLocations: true, locationIds: [] }, [A, B])).toBe(false);
    expect(isMenuItemSoldNowhere({ availableAtAllLocations: true, locationIds: [A] }, [A, B])).toBe(false);
    expect(isMenuItemSoldNowhere({ availableAtAllLocations: true, locationIds: [A, B, ARCHIVED] }, [A, B])).toBe(true);
  });
});
