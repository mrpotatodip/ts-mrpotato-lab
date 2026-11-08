import { Hono } from "hono";
import { GroupMemberParamSchema } from "@repo/contracts/elise";
import { withPool } from "#/lib/db-connection";
import { runEffect } from "#/lib/effect-query";
import { requireTenantManager, userIdOf } from "#/lib/require-tenant-manager";
import { zValidator } from "#/lib/zod-validator";
import { addGroupMemberSvc } from "#/modules/groups/handlers";
import { addGroupMemberDoc } from "#/modules/groups/openapi";
import { AccountHeaderSchema } from "#/modules/scans/schemas";
import type { AppEnv } from "#/types/variables";

const app = new Hono<AppEnv>();

app.put("/:groupId/members/:partyId", addGroupMemberDoc, requireTenantManager, zValidator("header", AccountHeaderSchema), zValidator("param", GroupMemberParamSchema), async (c) => {
  const { "x-account-id": accountId } = c.req.valid("header");
  const { groupId, partyId } = c.req.valid("param");
  const data = await withPool(
    c.env.DATABASE_URL,
    (promise) => c.executionCtx.waitUntil(promise),
    (db) => runEffect(addGroupMemberSvc(db, accountId, userIdOf(c), groupId, partyId)),
  );
  return c.json({ data, error: null });
});

export default app;
