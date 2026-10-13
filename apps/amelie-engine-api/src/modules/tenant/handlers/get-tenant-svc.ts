import type { Effect } from "effect";
import type { Tenant } from "@repo/contracts/amelie";
import type { DbConnectType } from "#/lib/db-connection";
import type { DbError, NotFound } from "#/lib/effect-query";
import { getTenantForUserEffect } from "#/modules/tenant/queries";

export const getTenantSvc = (
  db: DbConnectType,
  userId: string,
  tenantId: string,
): Effect.Effect<Tenant, DbError | NotFound> => getTenantForUserEffect(db, userId, tenantId);
