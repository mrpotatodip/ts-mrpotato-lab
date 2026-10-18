import { Hono } from "hono";
import { MenuItemLocationsBodySchema, MenuItemParamSchema, type MenuItemLocationsBody } from "@repo/contracts/amelie";
import { zValidator } from "#/lib/zod-validator";
import type { AppEnv } from "#/types/variables";
import { db_connect } from "#/lib/db-connection";
import { runEffect } from "#/lib/effect-query";
import type { ValidatedContext } from "#/lib/validated-context-types";
import { requireBoundPower } from "#/modules/tenant";
import { setMenuItemLocationsSvc } from "#/modules/menu/handlers";
import { setMenuItemSoldOutLocationsDoc } from "#/modules/menu/openapi";

const app = new Hono<AppEnv>();

app.put(
  "/items/:itemId/sold-out-locations",
  setMenuItemSoldOutLocationsDoc,
  zValidator("param", MenuItemParamSchema),
  zValidator("json", MenuItemLocationsBodySchema),
  requireBoundPower("store:menu:availability:update", (c: ValidatedContext<{ json: MenuItemLocationsBody }>) =>
    c.req.valid("json").locationIds,
  ),
  async (c) => {
    const { itemId } = c.req.valid("param");
    const db = db_connect(c.env.HYPERDRIVE_REALTIME.connectionString);
    const data = await runEffect(setMenuItemLocationsSvc(db, c.get("tenantId"), itemId, c.req.valid("json"), c.get("coverage")));
    return c.json({ data, error: null });
  },
);

export default app;
