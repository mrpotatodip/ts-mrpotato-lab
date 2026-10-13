import { Hono } from "hono";
import { zValidator } from "#/lib/zod-validator";
import type { AppEnv } from "#/types/variables";
import { db_connect } from "#/lib/db-connection";
import { runEffect } from "#/lib/effect-query";
import { getTenantSvc } from "#/modules/tenant/handlers";
import { getTenantDoc } from "#/modules/tenant/openapi";
import { TenantParamSchema } from "@repo/contracts/amelie";

const app = new Hono<AppEnv>();

app.get("/:tenantId", getTenantDoc, zValidator("param", TenantParamSchema), async (c) => {
  const { tenantId } = c.req.valid("param");
  const db = db_connect(c.env.HYPERDRIVE_REALTIME.connectionString);
  const data = await runEffect(getTenantSvc(db, c.get("userId"), tenantId));
  return c.json({ data, error: null });
});

export default app;
