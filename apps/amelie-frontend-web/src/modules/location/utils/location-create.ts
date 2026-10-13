import type { Country, CreateLocationBody } from "@repo/contracts/amelie";

// -----
// The add-Location form asks which Country only when
// the cafe sells in two or more.
// -----
export const needsCountryChoice = (active: Country[]): boolean => active.length > 1;

export const toLocationCreateBody = (name: string, countryId: string | null, active: Country[]): CreateLocationBody => {
  const body: CreateLocationBody = { name: name.trim() };
  if (needsCountryChoice(active) && countryId) body.countryId = countryId;
  return body;
};
