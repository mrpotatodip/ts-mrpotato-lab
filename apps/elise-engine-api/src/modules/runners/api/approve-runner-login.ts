import { Hono } from "hono";
import { ApproveRunnerLoginBodySchema } from "@repo/contracts/elise";
import { runEffect } from "#/lib/effect-query";
import { requirePower, userIdOf } from "#/lib/require-power";
import { zValidator } from "#/lib/zod-validator";
import { approveRunnerLoginSvc } from "#/modules/runners/handlers";
import { notifyRunnerChange } from "#/modules/runners/lib";
import { approveRunnerLoginDoc } from "#/modules/runners/openapi";
import { AccountHeaderSchema } from "#/modules/scans/schemas";
import type { AppEnv } from "#/types/variables";

const app = new Hono<AppEnv>();

app.post("/login/approve", approveRunnerLoginDoc, requirePower("company:runners:create"), zValidator("header", AccountHeaderSchema), zValidator("json", ApproveRunnerLoginBodySchema), async (c) => {
  const { "x-account-id": accountId } = c.req.valid("header");
  const body = c.req.valid("json");
  const ip = c.req.header("cf-connecting-ip") ?? "local";
  const actorUserId = userIdOf(c);
  const data = await c.get("deps").withTenant(c, accountId, (db) => runEffect(approveRunnerLoginSvc(db, accountId, actorUserId, ip, body)));
  await notifyRunnerChange(c, { kind: "runner-added", power: "company:runners:create", accountId, runnerId: data.runnerId, actorUserId });
  return c.json({ data, error: null });
});

export default app;
