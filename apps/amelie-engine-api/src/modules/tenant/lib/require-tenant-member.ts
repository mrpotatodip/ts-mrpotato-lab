import { createMiddleware } from "hono/factory";
import { TenantIdSchema } from "@repo/contracts/amelie";
import { db_connect } from "#/lib/db-connection";
import { runEffect } from "#/lib/effect-query";
import { ValidationError } from "#/lib/errors";
import type { AppEnv } from "#/types/variables";
import { getTenantSvc } from "#/modules/tenant/handlers";
import { TENANT_ID_REQUIRED } from "#/modules/tenant/constants";

// -----
// ?tenantId= must name a Tenant the signed-in
// Person belongs to; anything else is a 404.
// -----
export const requireTenantMember = createMiddleware<AppEnv>(async (c, next) => {
  const parsed = TenantIdSchema.safeParse(c.req.query("tenantId"));
  if (!parsed.success) throw new ValidationError(TENANT_ID_REQUIRED);
  const db = db_connect(c.env.HYPERDRIVE_REALTIME.connectionString);
  const tenant = await runEffect(getTenantSvc(db, c.get("userId"), parsed.data));
  c.set("tenantId", tenant.id);
  c.set("powers", tenant.powers);
  c.set("coverage", tenant.coverage);
  await next();
});
