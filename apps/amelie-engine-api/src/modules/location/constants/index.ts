// -----
// Messages
// -----
export const LOCATION_NOT_FOUND = "Location not found";
export const LOCATION_NOT_FOUND_CHOOSE = "Location not found. Choose one of:";
export const LOCATION_NEEDS_LOCATION = "This cafe has several locations. Choose one with locationId.";
export const LOCATION_ROLE_COVERS = (names: readonly string[]) =>
  names.length === 0 ? "Your Role covers no Location." : `Your Role covers: ${names.join(", ")}.`;
export const LOCATION_LAST_ACTIVE = "A cafe must keep at least one active location";
export const LOCATION_SLUG_TAKEN = "Another location was added at the same time. Try again.";

// -----
// Slugs
// -----
export const LOCATION_SLUG_MAX_LENGTH = 40;
export const LOCATION_SLUG_FALLBACK = "location";
export const LOCATION_SLUG_CONSTRAINT = "uq_tenant_locations_tenant_slug";
