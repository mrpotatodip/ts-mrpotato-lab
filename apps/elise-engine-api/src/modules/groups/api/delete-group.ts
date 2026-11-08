import { Hono } from "hono";
import { GroupParamSchema } from "@repo/contracts/elise";
import { withPool } from "#/lib/db-connection";
import { runEffect } from "#/lib/effect-query";
import { requireTenantManager, userIdOf } from "#/lib/require-tenant-manager";
import { zValidator } from "#/lib/zod-validator";
import { deleteGroupSvc } from "#/modules/groups/handlers";
import { deleteGroupDoc } from "#/modules/groups/openapi";
import { AccountHeaderSchema } from "#/modules/scans/schemas";
import type { AppEnv } from "#/types/variables";

const app = new Hono<AppEnv>();

app.delete("/:groupId", deleteGroupDoc, requireTenantManager, zValidator("header", AccountHeaderSchema), zValidator("param", GroupParamSchema), async (c) => {
  const { "x-account-id": accountId } = c.req.valid("header");
  const { groupId } = c.req.valid("param");
  const data = await withPool(
    c.env.DATABASE_URL,
    (promise) => c.executionCtx.waitUntil(promise),
    (db) => runEffect(deleteGroupSvc(db, accountId, userIdOf(c), groupId)),
  );
  return c.json({ data, error: null });
});

export default app;
