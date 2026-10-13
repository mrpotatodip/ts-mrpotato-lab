import { Effect } from "effect";
import type { DbConnectType } from "#/lib/db-connection";
import { Invalid, NotFound, type DbError } from "#/lib/effect-query";
import { COUNTRY_NOT_FOUND, COUNTRY_REQUIRED } from "#/modules/country/constants";
import { listOpenCountryRefsEffect } from "#/modules/country/queries";

// -----
// The Country a write goes to: the one named, which
// must be an open Country of the Tenant, else the
// Tenant's only one. With several open and none named
// the caller must say which.
// -----
export const chooseCountryIdSvc = (
  db: DbConnectType,
  tenantId: string,
  requested: string | undefined,
): Effect.Effect<string, NotFound | Invalid | DbError> =>
  listOpenCountryRefsEffect(db, tenantId).pipe(
    Effect.flatMap((open): Effect.Effect<string, NotFound | Invalid> => {
      if (requested !== undefined) {
        return open.some((country) => country.id === requested)
          ? Effect.succeed(requested)
          : Effect.fail(new NotFound({ message: COUNTRY_NOT_FOUND }));
      }
      return open.length === 1 ? Effect.succeed(open[0].id) : Effect.fail(new Invalid({ message: COUNTRY_REQUIRED }));
    }),
  );
