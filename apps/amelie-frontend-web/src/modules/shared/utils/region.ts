import { COUNTRIES, type CountryValue, type CurrencyValue } from "@repo/contracts/amelie";

const COUNTRY_NAMES = new Intl.DisplayNames(["en"], { type: "region" });

export const countryName = (country: string): string => COUNTRY_NAMES.of(country) ?? country;

export const COUNTRY_OPTIONS: ReadonlyArray<{ code: CountryValue; name: string }> = COUNTRIES.map(
  ({ country }) => ({ code: country, name: countryName(country) }),
).toSorted((a, b) => a.name.localeCompare(b.name));

export function currencyForCountry(country: CountryValue): CurrencyValue;
export function currencyForCountry(country: string): CurrencyValue | "";
export function currencyForCountry(country: string): CurrencyValue | "" {
  return COUNTRIES.find((entry) => entry.country === country)?.currency ?? "";
}
