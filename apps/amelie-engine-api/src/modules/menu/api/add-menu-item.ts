import { Hono } from "hono";
import { MenuItemBodySchema } from "@repo/contracts/amelie";
import { zValidator } from "#/lib/zod-validator";
import type { AppEnv } from "#/types/variables";
import { db_connect } from "#/lib/db-connection";
import { runEffect } from "#/lib/effect-query";
import { requireTenantEditor } from "#/modules/tenant";
import { addMenuItemSvc } from "#/modules/menu/handlers";
import { addMenuItemDoc } from "#/modules/menu/openapi";

const app = new Hono<AppEnv>();

app.post(
  "/items",
  addMenuItemDoc,
  requireTenantEditor,
  zValidator("json", MenuItemBodySchema),
  async (c) => {
    const db = db_connect(c.env.HYPERDRIVE_REALTIME.connectionString);
    const data = await runEffect(addMenuItemSvc(db, c.get("tenantId"), c.req.valid("json")));
    return c.json({ data, error: null });
  },
);

export default app;
