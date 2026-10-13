import type { CountryRef } from "#/modules/country/types";

// -----
// A customer, an embed or the model names a Country
// by id, code (CA) or name (Canada), any case. Only
// open ones are passed.
// -----
export const matchCountryRef = (open: CountryRef[], ref: string): CountryRef | undefined => {
  const wanted = ref.trim().toLowerCase();
  return open.find(
    (country) =>
      country.id.toLowerCase() === wanted ||
      country.code.toLowerCase() === wanted ||
      country.name.toLowerCase() === wanted,
  );
};
