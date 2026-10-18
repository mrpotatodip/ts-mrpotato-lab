import { Effect } from "effect";
import type { Coverage } from "@repo/contracts/amelie";
import type { DbConnectType } from "#/lib/db-connection";
import { NeedsLocation, NotFound, type DbError } from "#/lib/effect-query";
import { LOCATION_NEEDS_LOCATION, LOCATION_NOT_FOUND, LOCATION_ROLE_COVERS } from "#/modules/location/constants";
import { chooseLocation } from "#/modules/location/lib";
import { listActiveLocationsEffect } from "#/modules/location/queries";
import type { ActiveLocation, LocationChoice } from "#/modules/location/types";

export const locationChoiceToEffect = (
  choice: LocationChoice,
  coverage: Coverage = "all",
): Effect.Effect<ActiveLocation, NotFound | NeedsLocation> => {
  if (choice.kind === "chosen") return Effect.succeed(choice.location);
  if (choice.kind === "unknown") return Effect.fail(new NotFound({ message: LOCATION_NOT_FOUND }));
  const message =
    coverage === "all"
      ? LOCATION_NEEDS_LOCATION
      : `${LOCATION_NEEDS_LOCATION} ${LOCATION_ROLE_COVERS(choice.options.map(({ name }) => name))}`;
  return Effect.fail(new NeedsLocation({ message, locations: choice.options }));
};

// -----
// The Location a request is about: the one named,
// or the Tenant's only one. Several Locations and
// none named fails with the options to pick from.
// Use when the answer belongs to one Location
// (hours, address, phone) and the caller can ask.
// -----
export const resolveLocationSvc = (
  db: DbConnectType,
  tenantId: string,
  locationId?: string,
  coverage: Coverage = "all",
): Effect.Effect<ActiveLocation, DbError | NotFound | NeedsLocation> =>
  listActiveLocationsEffect(db, tenantId).pipe(
    Effect.flatMap((active) => locationChoiceToEffect(chooseLocation(active, locationId, coverage), coverage)),
  );
