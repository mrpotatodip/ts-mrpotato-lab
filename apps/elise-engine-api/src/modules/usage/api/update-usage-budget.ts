import { Hono } from "hono";
import { UpdateUsageBudgetBodySchema } from "@repo/contracts/elise";
import { withPool } from "#/lib/db-connection";
import { runEffect } from "#/lib/effect-query";
import { requirePower, userIdOf } from "#/lib/require-power";
import { zValidator } from "#/lib/zod-validator";
import { AccountHeaderSchema } from "#/modules/scans/schemas";
import { updateUsageBudgetSvc } from "#/modules/usage/handlers";
import { updateUsageBudgetDoc } from "#/modules/usage/openapi";
import type { AppEnv } from "#/types/variables";

const app = new Hono<AppEnv>();

app.patch("/budget", updateUsageBudgetDoc, requirePower("company:usage:budget:update"), zValidator("header", AccountHeaderSchema), zValidator("json", UpdateUsageBudgetBodySchema), async (c) => {
  const { "x-account-id": accountId } = c.req.valid("header");
  const { monthlyBudgetUsd } = c.req.valid("json");
  const deps = c.get("deps");
  const spend = await deps.monthSpend(c.env, accountId);
  const data = await withPool(
    c.env.DATABASE_URL,
    (promise) => c.executionCtx.waitUntil(promise),
    (db) => runEffect(updateUsageBudgetSvc(c.env, db, deps.scanRepo(c.env), accountId, userIdOf(c), monthlyBudgetUsd, spend)),
  );
  return c.json({ data, error: null });
});

export default app;
