import { Hono } from "hono";
import type { AppEnv } from "#/types/variables";
import { db_connect } from "#/lib/db-connection";
import { runEffect } from "#/lib/effect-query";
import { listImportsSvc } from "#/modules/menu-import/handlers";
import { listImportsDoc } from "#/modules/menu-import/openapi";

const app = new Hono<AppEnv>();

app.get("/", listImportsDoc, async (c) => {
  const db = db_connect(c.env.HYPERDRIVE_REALTIME.connectionString);
  const data = await runEffect(listImportsSvc(db, c.get("tenantId")));
  return c.json({ data, error: null });
});

export default app;
