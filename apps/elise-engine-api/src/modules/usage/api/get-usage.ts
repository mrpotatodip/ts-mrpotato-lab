import { Hono } from "hono";
import { runEffect } from "#/lib/effect-query";
import { zValidator } from "#/lib/zod-validator";
import { AccountHeaderSchema } from "#/modules/scans/schemas";
import { getUsageSvc } from "#/modules/usage/handlers";
import { getUsageDoc } from "#/modules/usage/openapi";
import type { AppEnv } from "#/types/variables";

const app = new Hono<AppEnv>();

app.get("/", getUsageDoc, zValidator("header", AccountHeaderSchema), async (c) => {
  const { "x-account-id": accountId } = c.req.valid("header");
  const spend = await c.get("deps").monthSpend(c.env, accountId);
  const data = await runEffect(getUsageSvc(c.env, c.get("deps").scanRepo(c.env), accountId, spend));
  return c.json({ data, error: null });
});

export default app;
