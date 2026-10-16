import { Hono } from "hono";
import { MenuItemCountryParamSchema, SetMenuItemCountryPriceBodySchema } from "@repo/contracts/amelie";
import { zValidator } from "#/lib/zod-validator";
import type { AppEnv } from "#/types/variables";
import { db_connect } from "#/lib/db-connection";
import { runEffect } from "#/lib/effect-query";
import { requirePower } from "#/modules/tenant";
import { setMenuItemCountryPriceSvc } from "#/modules/menu/handlers";
import { setMenuItemCountryPriceDoc } from "#/modules/menu/openapi";

const app = new Hono<AppEnv>();

app.put(
  "/items/:itemId/countries/:countryId",
  setMenuItemCountryPriceDoc,
  requirePower("company:menu:country_prices:update"),
  zValidator("param", MenuItemCountryParamSchema),
  zValidator("json", SetMenuItemCountryPriceBodySchema),
  async (c) => {
    const { itemId, countryId } = c.req.valid("param");
    const db = db_connect(c.env.HYPERDRIVE_REALTIME.connectionString);
    const data = await runEffect(
      setMenuItemCountryPriceSvc(db, c.get("tenantId"), itemId, countryId, c.req.valid("json")),
    );
    return c.json({ data, error: null });
  },
);

export default app;
