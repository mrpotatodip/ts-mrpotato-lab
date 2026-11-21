import { Hono } from "hono";
import { CreateRunnerBodySchema } from "@repo/contracts/elise";
import { runEffect } from "#/lib/effect-query";
import { requirePower, userIdOf } from "#/lib/require-power";
import { zValidator } from "#/lib/zod-validator";
import { createRunnerSvc } from "#/modules/runners/handlers";
import { notifyRunnerChange } from "#/modules/runners/lib";
import { createRunnerDoc } from "#/modules/runners/openapi";
import { AccountHeaderSchema } from "#/modules/scans/schemas";
import type { AppEnv } from "#/types/variables";

const app = new Hono<AppEnv>();

app.post("/", createRunnerDoc, requirePower("company:runners:create"), zValidator("header", AccountHeaderSchema), zValidator("json", CreateRunnerBodySchema), async (c) => {
  const { "x-account-id": accountId } = c.req.valid("header");
  const body = c.req.valid("json");
  const actorUserId = userIdOf(c);
  const data = await c.get("deps").withTenant(c, accountId, (db) => runEffect(createRunnerSvc(db, accountId, actorUserId, body)));
  await notifyRunnerChange(c, { kind: "runner-added", power: "company:runners:create", accountId, runnerId: data.id, actorUserId });
  return c.json({ data, error: null }, 201);
});

export default app;
