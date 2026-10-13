import type { LocationRef } from "#/modules/location/types";

// -----
// A customer or an embed names a Location by
// id, slug or name; only active ones are passed.
// -----
export const matchLocationRef = (active: LocationRef[], ref: string): LocationRef | undefined => {
  const wanted = ref.trim().toLowerCase();
  return active.find(
    (location) =>
      location.id.toLowerCase() === wanted ||
      location.slug.toLowerCase() === wanted ||
      location.name.toLowerCase() === wanted,
  );
};
