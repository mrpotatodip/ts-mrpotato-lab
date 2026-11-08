import { Hono } from "hono";
import { TeamInviteParamSchema } from "@repo/contracts/elise";
import { withPool } from "#/lib/db-connection";
import { runEffect } from "#/lib/effect-query";
import { requireTenantManager, userIdOf } from "#/lib/require-tenant-manager";
import { zValidator } from "#/lib/zod-validator";
import { AccountHeaderSchema } from "#/modules/scans/schemas";
import { revokeInviteSvc } from "#/modules/team/handlers";
import { revokeTeamInviteDoc } from "#/modules/team/openapi";
import type { AppEnv } from "#/types/variables";

const app = new Hono<AppEnv>();

app.delete("/invites/:inviteId", revokeTeamInviteDoc, requireTenantManager, zValidator("header", AccountHeaderSchema), zValidator("param", TeamInviteParamSchema), async (c) => {
  const { "x-account-id": accountId } = c.req.valid("header");
  const { inviteId } = c.req.valid("param");
  const userId = userIdOf(c);
  const data = await withPool(
    c.env.DATABASE_URL,
    (promise) => c.executionCtx.waitUntil(promise),
    (db) => runEffect(revokeInviteSvc(db, accountId, userId, inviteId)),
  );
  return c.json({ data, error: null });
});

export default app;
