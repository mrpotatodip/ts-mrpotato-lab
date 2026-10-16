import { Hono } from "hono";
import type { AppEnv } from "#/types/variables";
import { db_connect } from "#/lib/db-connection";
import { runEffect } from "#/lib/effect-query";
import { listLocationsSvc } from "#/modules/location/handlers";
import { listLocationsDoc } from "#/modules/location/openapi";
import { requirePower } from "#/modules/tenant";

const app = new Hono<AppEnv>();

app.get("/", listLocationsDoc,
  requirePower("company:profile:locations:read"), async (c) => {
  const db = db_connect(c.env.HYPERDRIVE_REALTIME.connectionString);
  const data = await runEffect(listLocationsSvc(db, c.get("tenantId")));
  return c.json({ data, error: null });
});

export default app;
