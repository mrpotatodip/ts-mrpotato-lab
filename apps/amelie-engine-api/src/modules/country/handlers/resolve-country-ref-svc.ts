import { Effect } from "effect";
import type { DbConnectType } from "#/lib/db-connection";
import { NotFound, type DbError } from "#/lib/effect-query";
import { COUNTRY_NOT_FOUND_CHOOSE } from "#/modules/country/constants";
import { matchCountryRef } from "#/modules/country/lib";
import { listOpenCountryRefsEffect } from "#/modules/country/queries";
import type { CountryRef } from "#/modules/country/types";

// -----
// An id, code or name the caller gave, checked
// against the Tenant's open Countries. A foreign
// or archived one is not found, and the message
// lists the real options.
// -----
export const resolveCountryRefSvc = (
  db: DbConnectType,
  tenantId: string,
  ref: string,
): Effect.Effect<CountryRef, DbError | NotFound> =>
  listOpenCountryRefsEffect(db, tenantId).pipe(
    Effect.flatMap((open) => {
      const found = matchCountryRef(open, ref);
      if (found) return Effect.succeed(found);
      const names = open.map((country) => `${country.name} (${country.code})`).join(", ");
      return Effect.fail(new NotFound({ message: `${COUNTRY_NOT_FOUND_CHOOSE} ${names}` }));
    }),
  );
