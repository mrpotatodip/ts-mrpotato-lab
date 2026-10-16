import { Hono } from "hono";
import { TeamMemberParamSchema, TeamRoleBodySchema } from "@repo/contracts/amelie";
import { zValidator } from "#/lib/zod-validator";
import type { AppEnv } from "#/types/variables";
import { db_connect } from "#/lib/db-connection";
import { runEffect } from "#/lib/effect-query";
import { requirePower } from "#/modules/tenant";
import { updateTeamMemberSvc } from "#/modules/team/handlers";
import { updateTeamMemberDoc } from "#/modules/team/openapi";

const app = new Hono<AppEnv>();

app.patch(
  "/members/:partyId",
  updateTeamMemberDoc,
  requirePower("company:team:members:update"),
  zValidator("param", TeamMemberParamSchema),
  zValidator("json", TeamRoleBodySchema),
  async (c) => {
    const { partyId } = c.req.valid("param");
    const db = db_connect(c.env.HYPERDRIVE_REALTIME.connectionString);
    const data = await runEffect(updateTeamMemberSvc(db, c.get("tenantId"), partyId, c.req.valid("json").role, c.get("powers") ?? []));
    return c.json({ data, error: null });
  },
);

export default app;
