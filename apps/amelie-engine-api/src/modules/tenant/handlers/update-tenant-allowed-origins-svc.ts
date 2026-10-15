import { Effect } from "effect";
import type { Tenant } from "@repo/contracts/amelie";
import type { DbConnectType } from "#/lib/db-connection";
import { Forbidden, type DbError, type NotFound } from "#/lib/effect-query";
import { TENANT_EDITOR_ONLY } from "#/modules/tenant/constants";
import { getTenantForUserEffect, updateTenantAllowedOriginsEffect } from "#/modules/tenant/queries";

export const updateTenantAllowedOriginsSvc = (
  db: DbConnectType,
  userId: string,
  tenantId: string,
  allowedOrigins: string[],
): Effect.Effect<Tenant, DbError | NotFound | Forbidden> =>
  Effect.gen(function* () {
    const tenant = yield* getTenantForUserEffect(db, userId, tenantId);
    if (!tenant.canEdit) return yield* new Forbidden({ message: TENANT_EDITOR_ONLY });
    return yield* updateTenantAllowedOriginsEffect(db, userId, tenantId, allowedOrigins);
  });
