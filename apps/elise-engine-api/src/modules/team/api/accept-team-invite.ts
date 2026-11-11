import { Hono } from "hono";
import { AcceptTeamInviteBodySchema, TeamInviteTokenParamSchema } from "@repo/contracts/elise";
import { withPool } from "#/lib/db-connection";
import { runEffect } from "#/lib/effect-query";
import { zValidator } from "#/lib/zod-validator";
import { acceptInviteSvc } from "#/modules/team/handlers";
import { requireInviteLimit } from "#/modules/team/lib";
import { acceptTeamInviteDoc } from "#/modules/team/openapi";
import type { AppEnv } from "#/types/variables";

const app = new Hono<AppEnv>();

// -----
// A session is read only when the request sends
// credentials: a new person sends none.
// -----
app.post("/invites/:token/accept", acceptTeamInviteDoc, requireInviteLimit, zValidator("param", TeamInviteTokenParamSchema), zValidator("json", AcceptTeamInviteBodySchema), async (c) => {
  const { token } = c.req.valid("param");
  const body = c.req.valid("json");
  const sendsCredentials = Boolean(c.req.header("authorization") ?? c.req.header("cookie"));
  const signedInUserId = sendsCredentials ? await c.get("deps").sessionUserId(c) : undefined;
  const data = await withPool(
    c.env.DATABASE_URL,
    (promise) => c.executionCtx.waitUntil(promise),
    (db) => runEffect(acceptInviteSvc(db, token, body, signedInUserId)),
  );
  return c.json({ data, error: null });
});

export default app;
