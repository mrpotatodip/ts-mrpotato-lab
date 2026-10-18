import type { Country, Location, TeamBinding } from "@repo/contracts/amelie";
import { countryName } from "#/modules/shared";
import type { TeamAccess } from "../types";

export const accessFromBindings = (bindings: TeamBinding[]): TeamAccess =>
  bindings.length === 0 ? { mode: "whole" } : { mode: "bound", bindings };

export const bindingsFromAccess = (access: TeamAccess): TeamBinding[] | null => {
  if (access === null) return null;
  if (access.mode === "whole") return [];
  return access.bindings.length === 0 ? null : access.bindings;
};

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
