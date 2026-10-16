import { Hono } from "hono";
import type { AppEnv } from "#/types/variables";
import { db_connect } from "#/lib/db-connection";
import { runEffect } from "#/lib/effect-query";
import { listTeamRolesSvc } from "#/modules/team/handlers";
import { listTeamRolesDoc } from "#/modules/team/openapi";
import { requirePower } from "#/modules/tenant";

const app = new Hono<AppEnv>();

app.get("/roles", listTeamRolesDoc, requirePower("company:team:members:read"), async (c) => {
  const db = db_connect(c.env.HYPERDRIVE_REALTIME.connectionString);
  const data = await runEffect(listTeamRolesSvc(db, c.get("tenantId"), c.get("powers") ?? []));
  return c.json({ data, error: null });
});

export default app;
