import { Hono } from "hono";
import { zValidator } from "#/lib/zod-validator";
import { creditBalanceOf } from "#/modules/credit/utils";
import { getCreditDoc } from "#/modules/credit/openapi";
import { AccountHeaderSchema } from "#/modules/scans/schemas";
import type { AppEnv } from "#/types/variables";

const app = new Hono<AppEnv>();

app.get("/", getCreditDoc, zValidator("header", AccountHeaderSchema), async (c) => {
  const { "x-account-id": accountId } = c.req.valid("header");
  const spend = await c.get("deps").monthSpend(c.env, accountId);
  return c.json({ data: creditBalanceOf(spend), error: null });
});

export default app;
