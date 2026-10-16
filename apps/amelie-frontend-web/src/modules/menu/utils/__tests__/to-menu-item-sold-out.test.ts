import { describe, expect, it } from "vitest";
import type { MenuItem } from "@repo/contracts/amelie";

import { isMenuItemSoldOutHere, toMenuItemSoldOutChange } from "../to-menu-item-sold-out";

const DOWNTOWN = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const AIRPORT = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const OPEN = [DOWNTOWN, AIRPORT];

const latte = {
  isAvailable: true,
  availableAtAllLocations: true,
  locationIds: [] as string[],
} satisfies Pick<MenuItem, "isAvailable" | "availableAtAllLocations" | "locationIds">;

describe("isMenuItemSoldOutHere", () => {
  it("is true only at the Location that marked an all-Locations item sold out", () => {
    const item = { ...latte, locationIds: [DOWNTOWN] };
    expect(isMenuItemSoldOutHere(item, DOWNTOWN)).toBe(true);
    expect(isMenuItemSoldOutHere(item, AIRPORT)).toBe(false);
  });

  it("is true everywhere while the item is off the menu", () => {
    expect(isMenuItemSoldOutHere({ ...latte, isAvailable: false }, DOWNTOWN)).toBe(true);
    expect(isMenuItemSoldOutHere({ ...latte, isAvailable: false }, AIRPORT)).toBe(true);
  });
});

describe("toMenuItemSoldOutChange", () => {
  it("marks sold out at one Location without listing the other", () => {
    expect(toMenuItemSoldOutChange(latte, DOWNTOWN, OPEN)).toEqual({
      kind: "locations",
      body: { availableAtAllLocations: true, locationIds: [DOWNTOWN] },
    });
  });

  it("clears sold out at that Location and leaves the other Location's sold-out row", () => {
    const item = { ...latte, locationIds: [DOWNTOWN, AIRPORT] };
    expect(toMenuItemSoldOutChange(item, DOWNTOWN, OPEN)).toEqual({
      kind: "locations",
      body: { availableAtAllLocations: true, locationIds: [AIRPORT] },
    });
  });

  it("turns the item off the menu when there is only one open Location", () => {
    expect(toMenuItemSoldOutChange(latte, DOWNTOWN, [DOWNTOWN])).toEqual({ kind: "item", isAvailable: false });
  });

  it("puts a globally unavailable item back on the menu", () => {
    expect(toMenuItemSoldOutChange({ ...latte, isAvailable: false }, DOWNTOWN, OPEN)).toEqual({
      kind: "item",
      isAvailable: true,
    });
  });
});
