import type { Country, Location } from "@repo/contracts/amelie";

import { countryLabel } from "#/modules/country";

export const MENU_INTRO = "The categories and items the assistant describes to customers.";
export const STORE_MENU_INTRO = "Mark items sold out or back on. Edit names, photos and prices on Master menu.";

type MenuScopeLineInput = {
  country: Pick<Country, "country" | "currency"> | undefined;
  location: Pick<Location, "name"> | undefined;
  emptyPlace: boolean;
};

export function toMenuScopeLine({ country, location, emptyPlace }: MenuScopeLineInput): string | null {
  if (!country) return null;
  const named = countryLabel(country);
  if (location) return `${location.name} in ${named}`;
  if (emptyPlace) return `${named}, no location yet`;
  return named;
}

export function toMenuDescription(scope: MenuScopeLineInput, intro = MENU_INTRO): string {
  const line = toMenuScopeLine(scope);
  return line ? `${line}. ${intro}` : intro;
}
