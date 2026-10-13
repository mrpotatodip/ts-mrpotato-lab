import type { ActiveLocation, LocationChoice } from "#/modules/location/types";

// -----
// A named Location must be one of the active
// ones. With none named, a lone Location is
// used and several mean the caller must ask.
// -----
export const chooseLocation = (active: ActiveLocation[], requestedId?: string): LocationChoice => {
  if (requestedId !== undefined) {
    const found = active.find((location) => location.id === requestedId);
    return found ? { kind: "chosen", location: found } : { kind: "unknown" };
  }
  if (active.length === 1) return { kind: "chosen", location: active[0] };
  return { kind: "needs-location", options: active.map(({ id, name }) => ({ id, name })) };
};
