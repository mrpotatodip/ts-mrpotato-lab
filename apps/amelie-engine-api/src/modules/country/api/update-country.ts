import { Hono } from "hono";
import { CountryParamSchema, UpdateCountryBodySchema } from "@repo/contracts/amelie";
import { zValidator } from "#/lib/zod-validator";
import type { AppEnv } from "#/types/variables";
import { db_connect } from "#/lib/db-connection";
import { runEffect } from "#/lib/effect-query";
import { requireTenantEditor } from "#/modules/tenant";
import { updateCountryCurrencySvc } from "#/modules/country/handlers";
import { updateCountryDoc } from "#/modules/country/openapi";

const app = new Hono<AppEnv>();

app.patch(
  "/:countryId",
  updateCountryDoc,
  requireTenantEditor,
  zValidator("param", CountryParamSchema),
  zValidator("json", UpdateCountryBodySchema),
  async (c) => {
    const { countryId } = c.req.valid("param");
    const db = db_connect(c.env.HYPERDRIVE_REALTIME.connectionString);
    const { currency } = c.req.valid("json");
    const data = await runEffect(updateCountryCurrencySvc(db, c.get("tenantId"), countryId, currency));
    return c.json({ data, error: null });
  },
);

export default app;
