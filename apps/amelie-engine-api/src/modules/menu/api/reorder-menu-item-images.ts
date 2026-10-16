import { Hono } from "hono";
import { MenuItemParamSchema, MenuOrderBodySchema } from "@repo/contracts/amelie";
import { zValidator } from "#/lib/zod-validator";
import type { AppEnv } from "#/types/variables";
import { db_connect } from "#/lib/db-connection";
import { runEffect } from "#/lib/effect-query";
import { requirePower } from "#/modules/tenant";
import { reorderMenuItemImagesSvc } from "#/modules/menu/handlers";
import { reorderMenuItemImagesDoc } from "#/modules/menu/openapi";

const app = new Hono<AppEnv>();

app.put(
  "/items/:itemId/images/order",
  reorderMenuItemImagesDoc,
  requirePower("company:menu:images:reorder"),
  zValidator("param", MenuItemParamSchema),
  zValidator("json", MenuOrderBodySchema),
  async (c) => {
    const { itemId } = c.req.valid("param");
    const db = db_connect(c.env.HYPERDRIVE_REALTIME.connectionString);
    const data = await runEffect(reorderMenuItemImagesSvc(db, c.get("tenantId"), itemId, c.req.valid("json").ids));
    return c.json({ data, error: null });
  },
);

export default app;
