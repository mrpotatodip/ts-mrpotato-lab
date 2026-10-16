import { Hono } from "hono";
import type { AppEnv } from "#/types/variables";
import { db_connect } from "#/lib/db-connection";
import { runEffect } from "#/lib/effect-query";
import { listAdminRolesSvc } from "#/modules/admin-role/handlers";
import { listAdminRolesDoc } from "#/modules/admin-role/openapi";

const app = new Hono<AppEnv>();

app.get("/roles", listAdminRolesDoc, async (c) => {
  const db = db_connect(c.env.HYPERDRIVE_REALTIME.connectionString);
  const data = await runEffect(listAdminRolesSvc(db));
  return c.json({ data, error: null });
});

export default app;
