import type { TeamBinding } from "@repo/contracts/amelie";

// -----
// A Country Binding covers every Location in it, so
// a Location Binding inside a bound Country adds
// nothing. This drops those, drops repeats, and
// returns a stable order: Countries first, then
// Locations, by id.
// -----
export const foldBindings = (
  bindings: readonly TeamBinding[],
  countryOfLocation: ReadonlyMap<string, string>,
): TeamBinding[] => {
  const countries = new Set(bindings.filter((b) => b.kind === "country").map((b) => b.id));
  const locations = new Set(
    bindings
      .filter((b) => b.kind === "location" && !countries.has(countryOfLocation.get(b.id) ?? ""))
      .map((b) => b.id),
  );
  return [
    ...[...countries].toSorted().map((id) => ({ kind: "country" as const, id })),
    ...[...locations].toSorted().map((id) => ({ kind: "location" as const, id })),
  ];
};

export const sortBindings = (bindings: readonly TeamBinding[]): TeamBinding[] =>
  bindings.toSorted((a, b) => (a.kind === b.kind ? a.id.localeCompare(b.id) : a.kind === "country" ? -1 : 1));

export const sameBindings = (a: readonly TeamBinding[], b: readonly TeamBinding[]): boolean => {
  const left = sortBindings(a);
  const right = sortBindings(b);
  return left.length === right.length && left.every((x, i) => x.kind === right[i].kind && x.id === right[i].id);
};
