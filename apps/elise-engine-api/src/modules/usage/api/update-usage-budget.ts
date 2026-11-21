import { Hono } from "hono";
import { UpdateUsageBudgetBodySchema } from "@repo/contracts/elise";
import { runEffect } from "#/lib/effect-query";
import { requirePower, userIdOf } from "#/lib/require-power";
import { zValidator } from "#/lib/zod-validator";
import { AccountHeaderSchema } from "#/modules/scans/schemas";
import { dashboardLinkOf, enqueueEmailsQuietly } from "#/modules/email";
import { changeUsageBudgetSvc } from "#/modules/usage/handlers";
import { updateUsageBudgetDoc } from "#/modules/usage/openapi";
import type { AppEnv } from "#/types/variables";

const app = new Hono<AppEnv>();

app.patch("/budget", updateUsageBudgetDoc, requirePower("company:usage:budget:update"), zValidator("header", AccountHeaderSchema), zValidator("json", UpdateUsageBudgetBodySchema), async (c) => {
  const { "x-account-id": accountId } = c.req.valid("header");
  const { monthlyBudgetUsd } = c.req.valid("json");
  const userId = userIdOf(c);
  const deps = c.get("deps");
  const { usage, previousBudgetUsd, audience } = await deps.withTenant(c, accountId, (db) => runEffect(changeUsageBudgetSvc(c.env, db, accountId, userId, monthlyBudgetUsd)));
  if (previousBudgetUsd !== usage.budgetUsd) {
    const changedAt = new Date().toISOString();
    const link = dashboardLinkOf(c.env.DASHBOARD_URL, "/settings/budget");
    await enqueueEmailsQuietly(
      (mail) => deps.enqueueEmail(c.env, mail),
      audience.recipients.map((to) => ({ kind: "budget-changed", to, accountName: audience.accountName, actorName: audience.actorName, changedAt, previousBudgetUsd, budgetUsd: usage.budgetUsd, link })),
    );
  }
  return c.json({ data: usage, error: null });
});

export default app;
