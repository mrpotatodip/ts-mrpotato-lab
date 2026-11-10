import { Hono } from "hono";
import { dbConnect } from "#/lib/db-connection";
import { runEffect } from "#/lib/effect-query";
import { requirePower } from "#/lib/require-power";
import { zValidator } from "#/lib/zod-validator";
import { AccountHeaderSchema } from "#/modules/scans/schemas";
import { getBudgetChangesSvc } from "#/modules/usage/handlers";
import { getBudgetChangesDoc } from "#/modules/usage/openapi";
import type { AppEnv } from "#/types/variables";

const app = new Hono<AppEnv>();

app.get("/budget/changes", getBudgetChangesDoc, requirePower("company:usage:budget:update"), zValidator("header", AccountHeaderSchema), async (c) => {
  const { "x-account-id": accountId } = c.req.valid("header");
  const data = await runEffect(getBudgetChangesSvc(dbConnect(c.env.DATABASE_URL), accountId));
  return c.json({ data, error: null });
});

export default app;
