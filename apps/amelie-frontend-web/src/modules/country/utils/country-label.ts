import type { Country } from "@repo/contracts/amelie";
import { countryName } from "#/modules/shared";

export const countryLabel = (country: Pick<Country, "country" | "currency">): string =>
  `${countryName(country.country)} (${country.currency})`;
