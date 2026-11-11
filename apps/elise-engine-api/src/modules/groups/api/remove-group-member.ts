import { Hono } from "hono";
import { GroupMemberParamSchema } from "@repo/contracts/elise";
import { withPool } from "#/lib/db-connection";
import { runEffect } from "#/lib/effect-query";
import { requirePower, userIdOf } from "#/lib/require-power";
import { zValidator } from "#/lib/zod-validator";
import { removeGroupMemberSvc } from "#/modules/groups/handlers";
import { removeGroupMemberDoc } from "#/modules/groups/openapi";
import { AccountHeaderSchema } from "#/modules/scans/schemas";
import type { AppEnv } from "#/types/variables";

const app = new Hono<AppEnv>();

app.delete("/:groupId/members/:partyId", removeGroupMemberDoc, requirePower("company:team:groups:update"), zValidator("header", AccountHeaderSchema), zValidator("param", GroupMemberParamSchema), async (c) => {
  const { "x-account-id": accountId } = c.req.valid("header");
  const { groupId, partyId } = c.req.valid("param");
  const data = await withPool(
    c.env.DATABASE_URL,
    (promise) => c.executionCtx.waitUntil(promise),
    (db) => runEffect(removeGroupMemberSvc(db, accountId, userIdOf(c), groupId, partyId)),
  );
  return c.json({ data, error: null });
});

export default app;
