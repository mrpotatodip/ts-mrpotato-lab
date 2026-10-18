import { Effect } from "effect";
import { covers, type Coverage } from "@repo/contracts/amelie";
import { Forbidden } from "#/lib/effect-query";
import { TENANT_LOCATION_NOT_COVERED, TENANT_LOCATIONS_NOT_COVERED } from "#/modules/tenant/constants";

// -----
// For a bound Power whose Locations are only known after a
// service loads them (a FAQ named by id, a Country's open
// Locations), where requireBoundPower's `locate` cannot see
// them. Same rule and 403 message as that guard: every
// Location must be covered. An empty list is a scope nobody
// can be bound to (a Country with no open Location), so it
// passes only for "all". A cafe-wide target skips the call.
// -----
export const requireCovered = (
  coverage: Coverage,
  locationIds: readonly string[],
): Effect.Effect<void, Forbidden> => {
  if (coverage === "all") return Effect.void;
  const uncovered = locationIds.filter((id) => !covers(coverage, [id]));
  if (locationIds.length > 0 && uncovered.length === 0) return Effect.void;
  return Effect.fail(
    new Forbidden({
      message: uncovered.length > 0 ? TENANT_LOCATIONS_NOT_COVERED(uncovered) : TENANT_LOCATION_NOT_COVERED,
    }),
  );
};
