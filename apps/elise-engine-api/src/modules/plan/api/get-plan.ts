import { Hono } from "hono";
import { dbConnect } from "#/lib/db-connection";
import { runEffect } from "#/lib/effect-query";
import { requirePower } from "#/lib/require-power";
import { zValidator } from "#/lib/zod-validator";
import { getPlanDoc } from "#/modules/plan/openapi";
import { planDetailsEffect } from "#/modules/plan/queries";
import { AccountHeaderSchema } from "#/modules/scans/schemas";
import type { AppEnv } from "#/types/variables";

const app = new Hono<AppEnv>();

app.get("/", getPlanDoc, requirePower("company:plan:read"), zValidator("header", AccountHeaderSchema), async (c) => {
  const { "x-account-id": accountId } = c.req.valid("header");
  const data = await runEffect(planDetailsEffect(dbConnect(c.env.DATABASE_URL), accountId, new Date()));
  return c.json({ data, error: null });
});

export default app;
