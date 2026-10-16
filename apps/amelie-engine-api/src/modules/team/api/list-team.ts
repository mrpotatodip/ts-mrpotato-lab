import { Hono } from "hono";
import type { AppEnv } from "#/types/variables";
import { db_connect } from "#/lib/db-connection";
import { runEffect } from "#/lib/effect-query";
import { listTeamSvc } from "#/modules/team/handlers";
import { listTeamDoc } from "#/modules/team/openapi";
import { requirePower } from "#/modules/tenant";

const app = new Hono<AppEnv>();

app.get("/", listTeamDoc,
  requirePower("company:team:members:read"), async (c) => {
  const db = db_connect(c.env.HYPERDRIVE_REALTIME.connectionString);
  const data = await runEffect(listTeamSvc(db, c.get("tenantId")));
  return c.json({ data, error: null });
});

export default app;
