import { Hono } from "hono";
import { TenantParamSchema, UpdateTenantCustomerChatBodySchema } from "@repo/contracts/amelie";
import { zValidator } from "#/lib/zod-validator";
import type { AppEnv } from "#/types/variables";
import { db_connect } from "#/lib/db-connection";
import { runEffect } from "#/lib/effect-query";
import { updateTenantCustomerChatSvc } from "#/modules/tenant/handlers";
import { updateTenantCustomerChatDoc } from "#/modules/tenant/openapi";

const app = new Hono<AppEnv>();

app.put(
  "/:tenantId/customer-chat",
  updateTenantCustomerChatDoc,
  zValidator("param", TenantParamSchema),
  zValidator("json", UpdateTenantCustomerChatBodySchema),
  async (c) => {
    const { tenantId } = c.req.valid("param");
    const { customerChatLabel, customerChatAccent } = c.req.valid("json");
    // -----
    // Realtime: the web app re-reads the Tenant
    // right after this write.
    // -----
    const db = db_connect(c.env.HYPERDRIVE_REALTIME.connectionString);
    const data = await runEffect(
      updateTenantCustomerChatSvc(db, c.get("userId"), tenantId, customerChatLabel, customerChatAccent),
    );
    return c.json({ data, error: null });
  },
);

export default app;
