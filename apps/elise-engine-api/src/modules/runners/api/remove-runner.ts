import { Hono } from "hono";
import { RunnerParamSchema } from "@repo/contracts/elise";
import { runEffect } from "#/lib/effect-query";
import { requirePower, userIdOf } from "#/lib/require-power";
import { zValidator } from "#/lib/zod-validator";
import { removeRunnerSvc } from "#/modules/runners/handlers";
import { notifyRunnerChange } from "#/modules/runners/lib";
import { removeRunnerDoc } from "#/modules/runners/openapi";
import { AccountHeaderSchema } from "#/modules/scans/schemas";
import type { AppEnv } from "#/types/variables";

const app = new Hono<AppEnv>();

app.delete("/:runnerId", removeRunnerDoc, requirePower("company:runners:delete"), zValidator("header", AccountHeaderSchema), zValidator("param", RunnerParamSchema), async (c) => {
  const { "x-account-id": accountId } = c.req.valid("header");
  const { runnerId } = c.req.valid("param");
  const data = await c.get("deps").withTenant(c, accountId, (db) => runEffect(removeRunnerSvc(db, accountId, runnerId)));
  await notifyRunnerChange(c, { kind: "runner-removed", power: "company:runners:delete", accountId, runnerId, actorUserId: userIdOf(c) });
  return c.json({ data, error: null });
});

export default app;
