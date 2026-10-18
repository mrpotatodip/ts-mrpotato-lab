import { Effect } from "effect";
import type { Coverage } from "@repo/contracts/amelie";
import type { DbConnectType } from "#/lib/db-connection";
import type { DbError } from "#/lib/effect-query";
import { boundCountryIdsEffect } from "#/modules/tenant/queries";

// -----
// The Countries a member may open Locations in, beside
// the Locations they cover: "all" when they are
// whole-cafe, else the open Countries their Country
// bindings name. A Location binding names no Country,
// so a member bound only to Locations gets [].
// -----
export type CountryScope = "all" | string[];

export const getCountryScopeSvc = (
  db: DbConnectType,
  userId: string,
  tenantId: string,
  coverage: Coverage,
): Effect.Effect<CountryScope, DbError> =>
  coverage === "all" ? Effect.succeed("all") : boundCountryIdsEffect(db, userId, tenantId);
