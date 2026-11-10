import { Hono } from "hono";
import { CreateGroupBodySchema } from "@repo/contracts/elise";
import { withPool } from "#/lib/db-connection";
import { runEffect } from "#/lib/effect-query";
import { requirePower, userIdOf } from "#/lib/require-power";
import { zValidator } from "#/lib/zod-validator";
import { createGroupSvc } from "#/modules/groups/handlers";
import { createGroupDoc } from "#/modules/groups/openapi";
import { AccountHeaderSchema } from "#/modules/scans/schemas";
import type { AppEnv } from "#/types/variables";

const app = new Hono<AppEnv>();

app.post("/", createGroupDoc, requirePower("company:team:groups:create"), zValidator("header", AccountHeaderSchema), zValidator("json", CreateGroupBodySchema), async (c) => {
  const { "x-account-id": accountId } = c.req.valid("header");
  const { name } = c.req.valid("json");
  const data = await withPool(
    c.env.DATABASE_URL,
    (promise) => c.executionCtx.waitUntil(promise),
    (db) => runEffect(createGroupSvc(db, accountId, userIdOf(c), name)),
  );
  return c.json({ data, error: null }, 201);
});

export default app;
