const names = new Intl.DisplayNames("en", { type: "region" });

// -----
// English name of a country code ("CA" is "Canada").
// A code with no name falls back to itself.
// -----
export const countryName = (code: string): string => {
  try {
    return names.of(code) ?? code;
  } catch {
    return code;
  }
};
