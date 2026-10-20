import { Hono } from "hono";
import { createMiddleware } from "hono/factory";
import { MenuItemLocationsBodySchema, MenuItemParamSchema, type MenuItemLocationsBody } from "@repo/contracts/amelie";
import { ForbiddenError } from "#/lib/errors";
import { zValidator } from "#/lib/zod-validator";
import type { AppEnv } from "#/types/variables";
import { db_connect } from "#/lib/db-connection";
import { runEffect } from "#/lib/effect-query";
import type { ValidatedContext } from "#/lib/validated-context-types";
import { requireBoundPower, TENANT_ALL_LOCATIONS_NOT_COVERED } from "#/modules/tenant";
import { setMenuItemLocationsSvc } from "#/modules/menu/handlers";
import { setMenuItemLocationsDoc } from "#/modules/menu/openapi";

const app = new Hono<AppEnv>();

const requireEveryLocationWhenAll = createMiddleware<AppEnv, string, { out: { json: MenuItemLocationsBody } }>(
  async (c, next) => {
    if (c.req.valid("json").availableAtAllLocations && c.get("coverage") !== "all") {
      throw new ForbiddenError(TENANT_ALL_LOCATIONS_NOT_COVERED);
    }
    await next();
  },
);

app.put(
  "/items/:itemId/locations",
  setMenuItemLocationsDoc,
  zValidator("param", MenuItemParamSchema),
  zValidator("json", MenuItemLocationsBodySchema),
  requireBoundPower("company:menu:locations:update", (c: ValidatedContext<{ json: MenuItemLocationsBody }>) =>
    c.req.valid("json").locationIds,
  ),
  requireEveryLocationWhenAll,
  async (c) => {
    const { itemId } = c.req.valid("param");
    const db = db_connect(c.env.HYPERDRIVE_REALTIME.connectionString);
    const data = await runEffect(setMenuItemLocationsSvc(db, c.get("tenantId"), itemId, c.req.valid("json"), c.get("coverage")));
    return c.json({ data, error: null });
  },
);

export default app;
