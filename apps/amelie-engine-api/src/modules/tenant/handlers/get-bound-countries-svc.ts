import { Effect } from "effect";
import type { Coverage } from "@repo/contracts/amelie";
import type { DbConnectType } from "#/lib/db-connection";
import type { DbError } from "#/lib/effect-query";
import { boundCountryIdsEffect } from "#/modules/tenant/queries";

export type CountryScope = "all" | string[];

export const getCountryScopeSvc = (
  db: DbConnectType,
  userId: string,
  tenantId: string,
  coverage: Coverage,
): Effect.Effect<CountryScope, DbError> =>
  coverage === "all" ? Effect.succeed("all") : boundCountryIdsEffect(db, userId, tenantId);
