import { Hono } from "hono";
import { RunnerJobParamSchema, RunnerJobResultBodySchema } from "@repo/contracts/elise";
import { dbConnect } from "#/lib/db-connection";
import { runEffect } from "#/lib/effect-query";
import { zValidator } from "#/lib/zod-validator";
import { reportJobSvc } from "#/modules/runners/handlers";
import { runnerOf } from "#/modules/runners/lib";
import { reportJobDoc } from "#/modules/runners/openapi";
import type { AppEnv } from "#/types/variables";

const app = new Hono<AppEnv>();

app.post("/jobs/:scanId/result", reportJobDoc, zValidator("param", RunnerJobParamSchema), zValidator("json", RunnerJobResultBodySchema), async (c) => {
  const runner = await runnerOf(c);
  const { scanId } = c.req.valid("param");
  const body = c.req.valid("json");
  const data = await runEffect(reportJobSvc(dbConnect(c.env.DATABASE_URL), runner.runnerId, scanId, body));
  return c.json({ data, error: null });
});

export default app;
