import type { Country, Location, TeamBinding } from "@repo/contracts/amelie";
import { countryName } from "#/modules/shared";

// -----
// What the member form is asking. null means the
// admin has not chosen yet: there is no default, and
// Save stays off until there is a choice.
// -----
export type TeamAccess = { mode: "whole" } | { mode: "bound"; bindings: TeamBinding[] } | null;

export const accessFromBindings = (bindings: TeamBinding[]): TeamAccess =>
  bindings.length === 0 ? { mode: "whole" } : { mode: "bound", bindings };

// -----
// The list to save: Whole cafe is empty, and "Only some"
// with nothing ticked is not a choice yet.
// -----
export const bindingsFromAccess = (access: TeamAccess): TeamBinding[] | null => {
  if (access === null) return null;
  if (access.mode === "whole") return [];
  return access.bindings.length === 0 ? null : access.bindings;
};

// -----
// Invite stays off for a Role that can be bound until
// the admin has chosen where it applies.
// -----
export const inviteChoiceReady = (canBeBound: boolean, access: TeamAccess): boolean =>
  !canBeBound || bindingsFromAccess(access) !== null;

const labelOf = (binding: TeamBinding, countries: Country[], locations: Location[]): string => {
  if (binding.kind === "country") {
    const found = countries.find((country) => country.id === binding.id);
    return `All of ${found ? countryName(found.country) : "a removed Country"}`;
  }
  return locations.find((location) => location.id === binding.id)?.name ?? "a removed Location";
};

export const describeBindings = (bindings: TeamBinding[], countries: Country[], locations: Location[]): string =>
  bindings.length === 0
    ? "Whole cafe"
    : bindings.map((binding) => labelOf(binding, countries, locations)).join(", ");

// -----
// A member whose Bindings reach no open Location is
// refused on every limited action, never widened.
// -----
export const hasNoActiveLocations = (
  bindings: TeamBinding[],
  countries: Country[],
  locations: Location[],
): boolean => {
  if (bindings.length === 0) return false;
  const openCountries = new Set(countries.filter((country) => country.archivedAt === null).map((c) => c.id));
  return !locations.some(
    (location) =>
      location.archivedAt === null &&
      bindings.some((binding) =>
        binding.kind === "location"
          ? binding.id === location.id
          : binding.id === location.countryId && openCountries.has(binding.id),
      ),
  );
};

export const isBound = (bindings: TeamBinding[], kind: TeamBinding["kind"], id: string): boolean =>
  bindings.some((binding) => binding.kind === kind && binding.id === id);

// -----
// Ticks or unticks one Country or Location. Ticking a
// Country folds away the Location bindings inside it,
// since the Country already covers them.
// -----
export const toggleBinding = (
  bindings: TeamBinding[],
  binding: TeamBinding,
  locations: Location[],
): TeamBinding[] => {
  if (isBound(bindings, binding.kind, binding.id)) {
    return bindings.filter((existing) => !(existing.kind === binding.kind && existing.id === binding.id));
  }
  if (binding.kind === "location") return [...bindings, binding];
  const inside = new Set(locations.filter((l) => l.countryId === binding.id).map((l) => l.id));
  return [...bindings.filter((existing) => !(existing.kind === "location" && inside.has(existing.id))), binding];
};
