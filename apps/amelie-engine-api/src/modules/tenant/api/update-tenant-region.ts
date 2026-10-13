import { Hono } from "hono";
import { TenantParamSchema, UpdateTenantRegionBodySchema } from "@repo/contracts/amelie";
import { zValidator } from "#/lib/zod-validator";
import type { AppEnv } from "#/types/variables";
import { db_connect } from "#/lib/db-connection";
import { runEffect } from "#/lib/effect-query";
import { updateTenantRegionSvc } from "#/modules/tenant/handlers";
import { updateTenantRegionDoc } from "#/modules/tenant/openapi";

const app = new Hono<AppEnv>();

app.patch(
  "/:tenantId/region",
  updateTenantRegionDoc,
  zValidator("param", TenantParamSchema),
  zValidator("json", UpdateTenantRegionBodySchema),
  async (c) => {
    const { tenantId } = c.req.valid("param");
    // -----
    // Realtime: the web app re-reads the Tenant
    // right after this write.
    // -----
    const db = db_connect(c.env.HYPERDRIVE_REALTIME.connectionString);
    const data = await runEffect(updateTenantRegionSvc(db, c.get("userId"), tenantId, c.req.valid("json")));
    return c.json({ data, error: null });
  },
);

export default app;
