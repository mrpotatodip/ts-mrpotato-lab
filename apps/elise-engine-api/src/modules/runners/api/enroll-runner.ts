import { Hono } from "hono";
import { EnrollRunnerBodySchema } from "@repo/contracts/elise";
import { dbConnect } from "#/lib/db-connection";
import { runEffect } from "#/lib/effect-query";
import { zValidator } from "#/lib/zod-validator";
import { enrollRunnerSvc } from "#/modules/runners/handlers";
import { requireEnrollLimit } from "#/modules/runners/lib";
import { enrollRunnerDoc } from "#/modules/runners/openapi";
import type { AppEnv } from "#/types/variables";

const app = new Hono<AppEnv>();

app.post("/enroll", enrollRunnerDoc, requireEnrollLimit, zValidator("json", EnrollRunnerBodySchema), async (c) => {
  const body = c.req.valid("json");
  const data = await runEffect(enrollRunnerSvc(dbConnect(c.env.DATABASE_URL), body));
  return c.json({ data, error: null });
});

export default app;
