import { Hono } from "hono";
import { dbConnect } from "#/lib/db-connection";
import { runEffect } from "#/lib/effect-query";
import { UnauthorizedError } from "#/lib/errors";
import { disconnectRunnerSvc } from "#/modules/runners/handlers";
import { disconnectRunnerDoc } from "#/modules/runners/openapi";
import { bearerTokenOf } from "#/modules/runners/utils";
import type { AppEnv } from "#/types/variables";

const app = new Hono<AppEnv>();

app.delete("/me", disconnectRunnerDoc, async (c) => {
  const token = bearerTokenOf(c.req.header("authorization"));
  if (!token) throw new UnauthorizedError();
  const revoked = await runEffect(disconnectRunnerSvc(dbConnect(c.env.DATABASE_URL), token));
  if (!revoked) throw new UnauthorizedError();
  return c.json({ data: { disconnected: true as const }, error: null });
});

export default app;
