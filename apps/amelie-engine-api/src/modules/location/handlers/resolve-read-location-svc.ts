import { Effect } from "effect";
import type { DbConnectType } from "#/lib/db-connection";
import { NotFound, type DbError } from "#/lib/effect-query";
import { LOCATION_NOT_FOUND } from "#/modules/location/constants";
import { chooseLocation } from "#/modules/location/lib";
import { listActiveLocationsEffect } from "#/modules/location/queries";
import type { LocationOption } from "#/modules/location/types";

// -----
// For reads that make sense Tenant-wide (menu,
// FAQs). A named Location must be an active one;
// a lone Location is used; with several and none
// named the answer is null, never "needs location".
// Use for Tenant-wide reads that a Location only narrows.
// -----
export const resolveReadLocationSvc = (
  db: DbConnectType,
  tenantId: string,
  locationId?: string,
): Effect.Effect<LocationOption | null, DbError | NotFound> =>
  listActiveLocationsEffect(db, tenantId).pipe(
    Effect.flatMap((active) => {
      const choice = chooseLocation(active, locationId);
      if (choice.kind === "unknown") return Effect.fail(new NotFound({ message: LOCATION_NOT_FOUND }));
      if (choice.kind === "needs-location") return Effect.succeed(null);
      return Effect.succeed({ id: choice.location.id, name: choice.location.name });
    }),
  );
