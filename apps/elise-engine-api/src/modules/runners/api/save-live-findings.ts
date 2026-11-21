import { Hono } from "hono";
import { RunnerJobParamSchema, SaveLiveFindingsBodySchema } from "@repo/contracts/elise";
import { runEffect } from "#/lib/effect-query";
import { zValidator } from "#/lib/zod-validator";
import { saveLiveFindingsSvc } from "#/modules/live-findings/handlers";
import { saveLiveFindingsDoc } from "#/modules/live-findings/openapi";
import { runnerOf } from "#/modules/runners/lib";
import type { AppEnv } from "#/types/variables";

const app = new Hono<AppEnv>();

app.post("/jobs/:scanId/findings", saveLiveFindingsDoc, zValidator("param", RunnerJobParamSchema), zValidator("json", SaveLiveFindingsBodySchema), async (c) => {
  const runner = await runnerOf(c);
  const { scanId } = c.req.valid("param");
  const body = c.req.valid("json");
  const data = await c.get("deps").withTenant(c, runner.accountId, (db) => runEffect(saveLiveFindingsSvc(db, runner, scanId, body)));
  return c.json({ data, error: null });
});

export default app;
