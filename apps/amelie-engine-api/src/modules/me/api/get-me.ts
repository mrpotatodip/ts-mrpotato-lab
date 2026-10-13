import { Hono } from "hono";
import type { AppEnv } from "#/types/variables";
import { db_connect } from "#/lib/db-connection";
import { runEffect } from "#/lib/effect-query";
import { getMeSvc } from "#/modules/me/handlers";
import { getMeDoc } from "#/modules/me/openapi";

const app = new Hono<AppEnv>();

app.get("/", getMeDoc, async (c) => {
  const db = db_connect(c.env.HYPERDRIVE_REALTIME.connectionString);
  const data = await runEffect(getMeSvc(db, c.get("userId")));
  return c.json({ data, error: null });
});

export default app;
