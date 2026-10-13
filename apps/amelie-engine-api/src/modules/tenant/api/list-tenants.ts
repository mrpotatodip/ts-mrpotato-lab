import { Hono } from "hono";
import type { AppEnv } from "#/types/variables";
import { db_connect } from "#/lib/db-connection";
import { runEffect } from "#/lib/effect-query";
import { listTenantsSvc } from "#/modules/tenant/handlers";
import { listTenantsDoc } from "#/modules/tenant/openapi";

const app = new Hono<AppEnv>();

app.get("/", listTenantsDoc, async (c) => {
  // -----
  // Realtime pool: a membership change must
  // show up on the next read.
  // -----
  const db = db_connect(c.env.HYPERDRIVE_REALTIME.connectionString);
  const data = await runEffect(listTenantsSvc(db, c.get("userId")));
  return c.json({ data, error: null });
});

export default app;
