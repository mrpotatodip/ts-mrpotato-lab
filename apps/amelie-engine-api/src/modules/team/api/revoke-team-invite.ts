import { Hono } from "hono";
import { TeamInviteParamSchema } from "@repo/contracts/amelie";
import { zValidator } from "#/lib/zod-validator";
import type { AppEnv } from "#/types/variables";
import { db_connect } from "#/lib/db-connection";
import { runEffect } from "#/lib/effect-query";
import { requirePower } from "#/modules/tenant";
import { revokeTeamInviteSvc } from "#/modules/team/handlers";
import { revokeTeamInviteDoc } from "#/modules/team/openapi";

const app = new Hono<AppEnv>();

app.delete(
  "/invites/:inviteId",
  revokeTeamInviteDoc,
  requirePower("company:team:invites:delete"),
  zValidator("param", TeamInviteParamSchema),
  async (c) => {
    const { inviteId } = c.req.valid("param");
    const db = db_connect(c.env.HYPERDRIVE_REALTIME.connectionString);
    const data = await runEffect(revokeTeamInviteSvc(db, c.get("tenantId"), inviteId));
    return c.json({ data, error: null });
  },
);

export default app;
