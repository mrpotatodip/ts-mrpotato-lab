import { Hono } from "hono";
import { TeamInviteParamSchema, TeamRoleBodySchema } from "@repo/contracts/amelie";
import { zValidator } from "#/lib/zod-validator";
import type { AppEnv } from "#/types/variables";
import { db_connect } from "#/lib/db-connection";
import { runEffect } from "#/lib/effect-query";
import { requirePower } from "#/modules/tenant";
import { updateTeamInviteSvc } from "#/modules/team/handlers";
import { updateTeamInviteDoc } from "#/modules/team/openapi";

const app = new Hono<AppEnv>();

app.patch(
  "/invites/:inviteId",
  updateTeamInviteDoc,
  requirePower("company:team:invites:update"),
  zValidator("param", TeamInviteParamSchema),
  zValidator("json", TeamRoleBodySchema),
  async (c) => {
    const { inviteId } = c.req.valid("param");
    const db = db_connect(c.env.HYPERDRIVE_REALTIME.connectionString);
    const data = await runEffect(updateTeamInviteSvc(db, c.get("tenantId"), inviteId, c.req.valid("json").role, c.get("powers") ?? []));
    return c.json({ data, error: null });
  },
);

export default app;
