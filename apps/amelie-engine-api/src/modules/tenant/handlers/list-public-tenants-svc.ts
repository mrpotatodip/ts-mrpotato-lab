import type { Effect } from "effect";
import type { DbConnectType } from "#/lib/db-connection";
import type { DbError } from "#/lib/effect-query";
import { listPublicTenantsEffect } from "#/modules/tenant/queries";
import type { PublicTenantListing } from "#/modules/tenant/types";

export const listPublicTenantsSvc = (
  db: DbConnectType,
): Effect.Effect<PublicTenantListing[], DbError> => listPublicTenantsEffect(db);
