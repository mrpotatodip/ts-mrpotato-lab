import { createMiddleware } from "hono/factory";
import { db_connect } from "#/lib/db-connection";
import { runEffect } from "#/lib/effect-query";
import { ForbiddenError } from "#/lib/errors";
import type { AppEnv } from "#/types/variables";
import { getTenantSvc } from "#/modules/tenant/handlers";
import { TENANT_EDITOR_ONLY } from "#/modules/tenant/constants";

// -----
// Runs after requireTenantMember: only a Person
// whose Role has can_edit may change that Tenant.
// -----
export const requireTenantEditor = createMiddleware<AppEnv>(async (c, next) => {
  const db = db_connect(c.env.HYPERDRIVE_REALTIME.connectionString);
  const tenant = await runEffect(getTenantSvc(db, c.get("userId"), c.get("tenantId")));
  if (!tenant.canEdit) {
    throw new ForbiddenError(TENANT_EDITOR_ONLY);
  }
  await next();
});
