import { Hono } from "hono";
import { GroupParamSchema, RenameGroupBodySchema } from "@repo/contracts/elise";
import { withPool } from "#/lib/db-connection";
import { runEffect } from "#/lib/effect-query";
import { requirePower, userIdOf } from "#/lib/require-power";
import { zValidator } from "#/lib/zod-validator";
import { renameGroupSvc } from "#/modules/groups/handlers";
import { renameGroupDoc } from "#/modules/groups/openapi";
import { AccountHeaderSchema } from "#/modules/scans/schemas";
import type { AppEnv } from "#/types/variables";

const app = new Hono<AppEnv>();

app.patch("/:groupId", renameGroupDoc, requirePower("company:team:groups:update"), zValidator("header", AccountHeaderSchema), zValidator("param", GroupParamSchema), zValidator("json", RenameGroupBodySchema), async (c) => {
  const { "x-account-id": accountId } = c.req.valid("header");
  const { groupId } = c.req.valid("param");
  const { name } = c.req.valid("json");
  const data = await withPool(
    c.env.DATABASE_URL,
    (promise) => c.executionCtx.waitUntil(promise),
    (db) => runEffect(renameGroupSvc(db, accountId, userIdOf(c), groupId, name)),
  );
  return c.json({ data, error: null });
});

export default app;
