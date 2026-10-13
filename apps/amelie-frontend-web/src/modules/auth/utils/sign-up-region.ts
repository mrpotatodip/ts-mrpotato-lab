import { COUNTRY_VALUES, type CountryValue } from "@repo/contracts/amelie";

export function countryFromLocale(locale: string | undefined): CountryValue | "" {
  if (!locale) return "";
  let region: string | undefined;
  try {
    region = new Intl.Locale(locale).region;
  } catch {
    return "";
  }
  return COUNTRY_VALUES.find((country) => country === region) ?? "";
}
