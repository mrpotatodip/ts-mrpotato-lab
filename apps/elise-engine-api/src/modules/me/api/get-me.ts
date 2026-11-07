import { Hono } from "hono";
import { dbConnect } from "#/lib/db-connection";
import { runEffect } from "#/lib/effect-query";
import { UnauthorizedError } from "#/lib/errors";
import { requireSession } from "#/lib/require-session";
import { getMeSvc } from "#/modules/me/handlers";
import { getMeDoc } from "#/modules/me/openapi";
import type { AppEnv } from "#/types/variables";

const app = new Hono<AppEnv>();

app.get("/", getMeDoc, requireSession, async (c) => {
  const userId = c.get("userId");
  if (!userId) throw new UnauthorizedError();
  const data = await runEffect(getMeSvc(dbConnect(c.env.DATABASE_URL), userId));
  return c.json({ data, error: null });
});

export default app;
