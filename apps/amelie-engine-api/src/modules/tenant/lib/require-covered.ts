import { Effect } from "effect";
import { uncoveredLocations, type Coverage } from "@repo/contracts/amelie";
import { Forbidden } from "#/lib/effect-query";
import { TENANT_LOCATION_NOT_COVERED, TENANT_LOCATIONS_NOT_COVERED } from "#/modules/tenant/constants";

export const requireCovered = (
  coverage: Coverage,
  locationIds: readonly string[],
): Effect.Effect<void, Forbidden> => {
  if (coverage === "all") return Effect.void;
  const gap = uncoveredLocations(coverage, locationIds);
  if (gap && gap.uncovered.length > 0) {
    return Effect.fail(new Forbidden({ message: TENANT_LOCATIONS_NOT_COVERED(gap.uncovered) }));
  }
  if (locationIds.length === 0) return Effect.fail(new Forbidden({ message: TENANT_LOCATION_NOT_COVERED }));
  return Effect.void;
};
