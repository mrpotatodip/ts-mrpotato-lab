import { Effect } from "effect";
import type { Tenant, TenantRegion } from "@repo/contracts/amelie";
import type { DbConnectType } from "#/lib/db-connection";
import { Forbidden, type Conflict, type DbError, type NotFound } from "#/lib/effect-query";
import { TENANT_EDITOR_ONLY } from "#/modules/tenant/constants";
import { getTenantForUserEffect, updateTenantRegionEffect } from "#/modules/tenant/queries";

export const updateTenantRegionSvc = (
  db: DbConnectType,
  userId: string,
  tenantId: string,
  region: TenantRegion,
): Effect.Effect<Tenant, DbError | NotFound | Forbidden | Conflict> =>
  Effect.gen(function* () {
    const tenant = yield* getTenantForUserEffect(db, userId, tenantId);
    if (!tenant.canEdit) return yield* new Forbidden({ message: TENANT_EDITOR_ONLY });
    return yield* updateTenantRegionEffect(db, userId, tenantId, region);
  });
