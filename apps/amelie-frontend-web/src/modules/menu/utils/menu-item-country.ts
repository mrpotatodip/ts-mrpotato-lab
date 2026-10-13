import type { MenuItem, SetMenuItemCountryPriceBody } from "@repo/contracts/amelie";

// -----
// With a Country picked the editor returns every item,
// and isSold says whether this Country sells it. Not
// sold means shown muted, not hidden.
// -----
export const isMenuItemMuted = (item: Pick<MenuItem, "isSold">): boolean => item.isSold === false;

// -----
// An item with no price in the Country cannot be sold
// there until one is entered.
// -----
export const needsCountryPrice = (item: Pick<MenuItem, "isSold" | "price" | "variants">): boolean =>
  item.isSold === false && item.price === null && item.variants === null;

// -----
// Only the flag: turning sold-here off keeps the
// price, so turning it on again loses nothing.
// -----
export const toSoldBody = (isSold: boolean): SetMenuItemCountryPriceBody => ({ isSold });

export const toPriceEntryBody = (price: string): SetMenuItemCountryPriceBody => ({ isSold: true, price: price.trim() });

// -----
// The price field of an item's body. Variants carry
// the price themselves. A blank price is an error for
// a cafe with one Country, and with a Country picked
// it means "leave that Country's price alone".
// -----
export const toItemPrice = (price: string, hasVariants: boolean, countryScoped: boolean): string | null => {
  if (hasVariants) return null;
  if (price.trim() === "" && countryScoped) return null;
  return price;
};
