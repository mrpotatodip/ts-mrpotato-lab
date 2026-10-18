import type { Coverage } from "@repo/contracts/amelie";
import type { ActiveLocation, LocationChoice } from "#/modules/location/types";

// -----
// A named Location must be one of the active
// ones. With none named, a lone Location is
// used and several mean the caller must ask.
// -----
export const chooseLocation = (
  active: ActiveLocation[],
  requestedId?: string,
  coverage: Coverage = "all",
): LocationChoice => {
  const reachable = coverage === "all" ? active : active.filter((location) => coverage.includes(location.id));
  if (requestedId !== undefined) {
    const found = reachable.find((location) => location.id === requestedId);
    return found ? { kind: "chosen", location: found } : { kind: "unknown" };
  }
  if (reachable.length === 1) return { kind: "chosen", location: reachable[0] };
  return { kind: "needs-location", options: reachable.map(({ id, name }) => ({ id, name })) };
};
