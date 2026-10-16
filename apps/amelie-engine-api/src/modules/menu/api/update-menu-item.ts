import { Hono } from "hono";
import { MenuItemBodySchema, MenuItemParamSchema } from "@repo/contracts/amelie";
import { zValidator } from "#/lib/zod-validator";
import type { AppEnv } from "#/types/variables";
import { db_connect } from "#/lib/db-connection";
import { runEffect } from "#/lib/effect-query";
import { requirePower } from "#/modules/tenant";
import { updateMenuItemSvc } from "#/modules/menu/handlers";
import { updateMenuItemDoc } from "#/modules/menu/openapi";

const app = new Hono<AppEnv>();

app.put(
  "/items/:itemId",
  updateMenuItemDoc,
  requirePower("company:menu:items:update"),
  zValidator("param", MenuItemParamSchema),
  zValidator("json", MenuItemBodySchema),
  async (c) => {
    const { itemId } = c.req.valid("param");
    const db = db_connect(c.env.HYPERDRIVE_REALTIME.connectionString);
    const data = await runEffect(updateMenuItemSvc(db, c.get("tenantId"), itemId, c.req.valid("json")));
    return c.json({ data, error: null });
  },
);

export default app;
