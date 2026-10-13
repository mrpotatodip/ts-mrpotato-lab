import { Hono } from "hono";
import { MenuItemParamSchema } from "@repo/contracts/amelie";
import { zValidator } from "#/lib/zod-validator";
import type { AppEnv } from "#/types/variables";
import { db_connect } from "#/lib/db-connection";
import { runEffect } from "#/lib/effect-query";
import { requireTenantEditor } from "#/modules/tenant";
import { deleteMenuItemSvc } from "#/modules/menu/handlers";
import { deleteMenuItemDoc } from "#/modules/menu/openapi";

const app = new Hono<AppEnv>();

app.delete(
  "/items/:itemId",
  deleteMenuItemDoc,
  requireTenantEditor,
  zValidator("param", MenuItemParamSchema),
  async (c) => {
    const { itemId } = c.req.valid("param");
    const db = db_connect(c.env.HYPERDRIVE_REALTIME.connectionString);
    const data = await runEffect(deleteMenuItemSvc(db, c.get("tenantId"), itemId));
    return c.json({ data, error: null });
  },
);

export default app;
