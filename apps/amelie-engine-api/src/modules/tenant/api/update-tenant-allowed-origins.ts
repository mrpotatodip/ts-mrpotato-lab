import { Hono } from "hono";
import { TenantParamSchema, UpdateTenantAllowedOriginsBodySchema } from "@repo/contracts/amelie";
import { zValidator } from "#/lib/zod-validator";
import type { AppEnv } from "#/types/variables";
import { db_connect } from "#/lib/db-connection";
import { runEffect } from "#/lib/effect-query";
import { updateTenantAllowedOriginsSvc } from "#/modules/tenant/handlers";
import { updateTenantAllowedOriginsDoc } from "#/modules/tenant/openapi";

const app = new Hono<AppEnv>();

app.put(
  "/:tenantId/allowed-origins",
  updateTenantAllowedOriginsDoc,
  zValidator("param", TenantParamSchema),
  zValidator("json", UpdateTenantAllowedOriginsBodySchema),
  async (c) => {
    const { tenantId } = c.req.valid("param");
    // -----
    // Realtime: the web app re-reads the Tenant
    // right after this write.
    // -----
    const db = db_connect(c.env.HYPERDRIVE_REALTIME.connectionString);
    const data = await runEffect(
      updateTenantAllowedOriginsSvc(db, c.get("userId"), tenantId, c.req.valid("json").allowedOrigins),
    );
    return c.json({ data, error: null });
  },
);

export default app;
