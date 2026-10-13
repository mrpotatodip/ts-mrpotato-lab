import { describe, expect, it } from "vitest";
import { MENU_ITEM_IMAGE_MAX } from "@repo/contracts/amelie";
import { API_BASE_URL } from "#/lib/api-base-url";
import { menuItemImagePath, remainingMenuItemImageSlots, toMenuItemImageUrl } from "../menu-item-image-url";

describe("toMenuItemImageUrl", () => {
  it("prefixes a relative path with the API origin", () => {
    expect(toMenuItemImageUrl("/menu-item-images/abc")).toBe(`${API_BASE_URL}/menu-item-images/abc`);
  });

  it("is null when there is no path", () => {
    expect(toMenuItemImageUrl(null)).toBeNull();
    expect(toMenuItemImageUrl("")).toBeNull();
  });
});

describe("remainingMenuItemImageSlots", () => {
  it("is the room left under the shared cap", () => {
    expect(remainingMenuItemImageSlots(0)).toBe(MENU_ITEM_IMAGE_MAX);
    expect(remainingMenuItemImageSlots(3)).toBe(MENU_ITEM_IMAGE_MAX - 3);
    expect(remainingMenuItemImageSlots(MENU_ITEM_IMAGE_MAX)).toBe(0);
    expect(remainingMenuItemImageSlots(MENU_ITEM_IMAGE_MAX + 1)).toBe(0);
  });
});

describe("menuItemImagePath", () => {
  it("is the public GET path", () => {
    expect(menuItemImagePath("11111111-1111-4111-8111-111111111111")).toBe(
      "/menu-item-images/11111111-1111-4111-8111-111111111111",
    );
  });
});
