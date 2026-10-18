import { Hono } from "hono";
import { MenuItemLocationsBodySchema, MenuItemParamSchema } from "@repo/contracts/amelie";
import { zValidator } from "#/lib/zod-validator";
import type { AppEnv } from "#/types/variables";
import { db_connect } from "#/lib/db-connection";
import { runEffect } from "#/lib/effect-query";
import { requirePower } from "#/modules/tenant";
import { setMenuItemLocationsSvc } from "#/modules/menu/handlers";
import { setMenuItemSoldOutLocationsDoc } from "#/modules/menu/openapi";

const app = new Hono<AppEnv>();

app.put(
  "/items/:itemId/sold-out-locations",
  setMenuItemSoldOutLocationsDoc,
  requirePower("store:menu:availability:update"),
  zValidator("param", MenuItemParamSchema),
  zValidator("json", MenuItemLocationsBodySchema),
  async (c) => {
    const { itemId } = c.req.valid("param");
    const db = db_connect(c.env.HYPERDRIVE_REALTIME.connectionString);
    const data = await runEffect(setMenuItemLocationsSvc(db, c.get("tenantId"), itemId, c.req.valid("json")));
    return c.json({ data, error: null });
  },
);

export default app;
