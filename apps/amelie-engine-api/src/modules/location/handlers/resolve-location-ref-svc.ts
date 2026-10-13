import { Effect } from "effect";
import type { DbConnectType } from "#/lib/db-connection";
import { NotFound, type DbError } from "#/lib/effect-query";
import { LOCATION_NOT_FOUND_CHOOSE } from "#/modules/location/constants";
import { matchLocationRef } from "#/modules/location/lib";
import { listActiveLocationRefsEffect } from "#/modules/location/queries";
import type { LocationRef } from "#/modules/location/types";

// -----
// An id, slug or name the caller gave, checked
// against the Tenant's active Locations. A
// foreign or archived one is not found, and the
// message lists the real options.
// Use for a free-text reference (slug or name,
// as well as id) from a caller outside the app.
// -----
export const resolveLocationRefSvc = (
  db: DbConnectType,
  tenantId: string,
  ref: string,
): Effect.Effect<LocationRef, DbError | NotFound> =>
  listActiveLocationRefsEffect(db, tenantId).pipe(
    Effect.flatMap((active) => {
      const found = matchLocationRef(active, ref);
      if (found) return Effect.succeed(found);
      const names = active.map((location) => location.name).join(", ");
      return Effect.fail(new NotFound({ message: `${LOCATION_NOT_FOUND_CHOOSE} ${names}` }));
    }),
  );
