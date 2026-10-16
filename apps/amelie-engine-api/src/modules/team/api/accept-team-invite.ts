import { Hono } from "hono";
import { AcceptTeamInviteBodySchema, TeamInviteTokenParamSchema } from "@repo/contracts/amelie";
import { zValidator } from "#/lib/zod-validator";
import type { AppEnv } from "#/types/variables";
import { createAuth } from "#/lib/auth";
import { db_connect } from "#/lib/db-connection";
import { runEffect } from "#/lib/effect-query";
import { acceptTeamInviteSvc } from "#/modules/team/handlers";
import { acceptTeamInviteDoc } from "#/modules/team/openapi";

const app = new Hono<AppEnv>();

app.post(
  "/:token/accept",
  acceptTeamInviteDoc,
  zValidator("param", TeamInviteTokenParamSchema),
  zValidator("json", AcceptTeamInviteBodySchema),
  async (c) => {
    const { token } = c.req.valid("param");
    const auth = createAuth(c);
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    const db = db_connect(c.env.HYPERDRIVE_REALTIME.connectionString);
    const data = await runEffect(
      acceptTeamInviteSvc(db, token, session?.user.id ?? null, c.req.valid("json")),
    );
    return c.json({ data, error: null });
  },
);

export default app;
