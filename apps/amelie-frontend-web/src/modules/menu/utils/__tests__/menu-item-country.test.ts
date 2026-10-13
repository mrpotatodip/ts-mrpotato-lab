import { describe, expect, it } from "vitest";
import { MenuItemBodySchema, SetMenuItemCountryPriceBodySchema, type MenuItem } from "@repo/contracts/amelie";
import { isMenuItemMuted, needsCountryPrice, toItemPrice, toPriceEntryBody, toSoldBody } from "../menu-item-country";
import { toMenuItemBody } from "../menu-item-body";

const COUNTRY_ID = "22222222-2222-4222-8222-222222222222";
const CATEGORY_ID = "33333333-3333-4333-8333-333333333333";

const latte: MenuItem = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "Latte",
  description: null,
  price: "6.25",
  currency: "CAD",
  variants: null,
  isAvailable: true,
  availableAtAllLocations: true,
  locationIds: [],
  imageUrl: null,
  images: [],
  dietaryTags: [],
  isSold: true,
};

describe("isMenuItemMuted", () => {
  it("is true only for an item the Country says it does not sell", () => {
    expect(isMenuItemMuted({ ...latte, isSold: false })).toBe(true);
    expect(isMenuItemMuted(latte)).toBe(false);
    expect(isMenuItemMuted({ ...latte, isSold: undefined })).toBe(false);
  });
});

describe("needsCountryPrice", () => {
  it("is true for a not-sold item that has no price in the Country yet", () => {
    expect(needsCountryPrice({ ...latte, price: null, isSold: false })).toBe(true);
  });

  it("is false once it has a price, even when it is not sold there", () => {
    expect(needsCountryPrice({ ...latte, isSold: false })).toBe(false);
    expect(needsCountryPrice(latte)).toBe(false);
  });
});

describe("the Country price bodies", () => {
  it("the sold toggle sends only the flag, so the price is kept", () => {
    expect(toSoldBody(false)).toEqual({ isSold: false });
    expect(SetMenuItemCountryPriceBodySchema.safeParse(toSoldBody(true)).success).toBe(true);
  });

  it("price entry trims the price and sells the item there", () => {
    const body = toPriceEntryBody(" 6.25 ");

    expect(body).toEqual({ isSold: true, price: "6.25" });
    expect(SetMenuItemCountryPriceBodySchema.safeParse(body).success).toBe(true);
    expect(SetMenuItemCountryPriceBodySchema.safeParse(toPriceEntryBody("six")).success).toBe(false);
  });
});

describe("toItemPrice", () => {
  it("is null when there are Variants, whatever was typed", () => {
    expect(toItemPrice("4.75", true, false)).toBeNull();
  });

  it("keeps a typed price, and a blank one is an error without a Country", () => {
    expect(toItemPrice("4.75", false, true)).toBe("4.75");
    expect(toItemPrice("", false, false)).toBe("");
  });

  it("a blank price with a Country leaves that Country's price alone", () => {
    expect(toItemPrice("  ", false, true)).toBeNull();
  });
});

describe("toMenuItemBody for an item with no price in the Country", () => {
  it("is accepted by the contract once it names the Country", () => {
    const priceless: MenuItem = { ...latte, price: null, isSold: false };

    const body = toMenuItemBody(priceless, CATEGORY_ID, { countryId: COUNTRY_ID });

    expect(MenuItemBodySchema.safeParse(body).success).toBe(true);
  });
});
