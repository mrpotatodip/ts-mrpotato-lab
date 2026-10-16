import { Hono } from "hono";
import type { AppEnv } from "#/types/variables";
import { db_connect } from "#/lib/db-connection";
import { runEffect } from "#/lib/effect-query";
import { listCountriesSvc } from "#/modules/country/handlers";
import { listCountriesDoc } from "#/modules/country/openapi";
import { requirePower } from "#/modules/tenant";

const app = new Hono<AppEnv>();

app.get("/", listCountriesDoc,
  requirePower("company:profile:countries:read"), async (c) => {
  const db = db_connect(c.env.HYPERDRIVE_REALTIME.connectionString);
  const data = await runEffect(listCountriesSvc(db, c.get("tenantId")));
  return c.json({ data, error: null });
});

export default app;
