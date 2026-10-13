import type { Effect } from "effect";
import type { Tenant } from "@repo/contracts/amelie";
import type { DbConnectType } from "#/lib/db-connection";
import type { DbError } from "#/lib/effect-query";
import { listTenantsForUserEffect } from "#/modules/tenant/queries";

export const listTenantsSvc = (
  db: DbConnectType,
  userId: string,
): Effect.Effect<Tenant[], DbError> => listTenantsForUserEffect(db, userId);
