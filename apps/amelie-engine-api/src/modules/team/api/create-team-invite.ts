import { Hono } from "hono";
import { CreateTeamInviteBodySchema } from "@repo/contracts/amelie";
import { zValidator } from "#/lib/zod-validator";
import type { AppEnv } from "#/types/variables";
import { db_connect } from "#/lib/db-connection";
import { runEffect } from "#/lib/effect-query";
import { requirePower } from "#/modules/tenant";
import { createTeamInviteSvc } from "#/modules/team/handlers";
import { createTeamInviteDoc } from "#/modules/team/openapi";

const app = new Hono<AppEnv>();

app.post("/invites", createTeamInviteDoc, requirePower("company:team:invites:create"), zValidator("json", CreateTeamInviteBodySchema), async (c) => {
  const db = db_connect(c.env.HYPERDRIVE_REALTIME.connectionString);
  const data = await runEffect(createTeamInviteSvc(db, c.get("tenantId"), c.get("userId"), c.get("powers") ?? [], c.req.valid("json")));
  return c.json({ data, error: null }, 201);
});

export default app;
