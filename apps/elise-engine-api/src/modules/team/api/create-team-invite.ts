import { Hono } from "hono";
import { CreateTeamInviteBodySchema } from "@repo/contracts/elise";
import { withPool } from "#/lib/db-connection";
import { runEffect } from "#/lib/effect-query";
import { requirePower, userIdOf } from "#/lib/require-power";
import { zValidator } from "#/lib/zod-validator";
import { AccountHeaderSchema } from "#/modules/scans/schemas";
import { createInviteSvc } from "#/modules/team/handlers";
import { createTeamInviteDoc } from "#/modules/team/openapi";
import type { AppEnv } from "#/types/variables";

const app = new Hono<AppEnv>();

app.post("/invites", createTeamInviteDoc, requirePower("company:team:invites:create"), zValidator("header", AccountHeaderSchema), zValidator("json", CreateTeamInviteBodySchema), async (c) => {
  const { "x-account-id": accountId } = c.req.valid("header");
  const body = c.req.valid("json");
  const userId = userIdOf(c);
  const data = await withPool(
    c.env.DATABASE_URL,
    (promise) => c.executionCtx.waitUntil(promise),
    (db) =>
      runEffect(
        createInviteSvc(db, accountId, userId, body, {
          dashboardUrl: c.env.DASHBOARD_URL,
          enqueue: (mail) => c.get("deps").enqueueInviteEmail(c.env, mail),
        }),
      ),
  );
  return c.json({ data, error: null }, 201);
});

export default app;
