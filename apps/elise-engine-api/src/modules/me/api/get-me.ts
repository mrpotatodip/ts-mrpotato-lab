import { Hono } from "hono";
import { dbConnect } from "#/lib/db-connection";
import { runEffect } from "#/lib/effect-query";
import { requireSession } from "#/lib/require-session";
import { getMeSvc } from "#/modules/me/handlers";
import { getMeDoc } from "#/modules/me/openapi";
import type { AppEnv } from "#/types/variables";

const app = new Hono<AppEnv>();

app.get("/", getMeDoc, requireSession, async (c) => {
  const data = await runEffect(getMeSvc(dbConnect(c.env.DATABASE_URL), c.get("userId")));
  return c.json({ data, error: null });
});

export default app;
