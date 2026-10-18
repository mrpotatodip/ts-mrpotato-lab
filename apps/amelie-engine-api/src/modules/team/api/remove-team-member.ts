import { Hono } from "hono";
import { TeamMemberParamSchema } from "@repo/contracts/amelie";
import { zValidator } from "#/lib/zod-validator";
import type { AppEnv } from "#/types/variables";
import { db_connect } from "#/lib/db-connection";
import { runEffect } from "#/lib/effect-query";
import { requirePower } from "#/modules/tenant";
import { removeTeamMemberSvc } from "#/modules/team/handlers";
import { removeTeamMemberDoc } from "#/modules/team/openapi";

const app = new Hono<AppEnv>();

app.delete(
  "/members/:partyId",
  removeTeamMemberDoc,
  requirePower("company:team:members:delete"),
  zValidator("param", TeamMemberParamSchema),
  async (c) => {
    const { partyId } = c.req.valid("param");
    const db = db_connect(c.env.HYPERDRIVE_REALTIME.connectionString);
    const data = await runEffect(removeTeamMemberSvc(db, c.get("tenantId"), partyId, c.get("userId"), c.get("powers") ?? []));
    return c.json({ data, error: null });
  },
);

export default app;
