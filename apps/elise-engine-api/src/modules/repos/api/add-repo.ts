import { Hono } from "hono";
import { dbConnect, withPool } from "#/lib/db-connection";
import { runEffect } from "#/lib/effect-query";
import { zValidator } from "#/lib/zod-validator";
import { addRepoSvc } from "#/modules/repos/handlers";
import { addRepoDoc } from "#/modules/repos/openapi";
import { AddRepoBodySchema } from "#/modules/repos/schemas";
import { AccountHeaderSchema } from "#/modules/scans/schemas";
import type { AppEnv } from "#/types/variables";

const app = new Hono<AppEnv>();

app.post("/", addRepoDoc, zValidator("header", AccountHeaderSchema), zValidator("json", AddRepoBodySchema), async (c) => {
  const { "x-account-id": accountId } = c.req.valid("header");
  const body = c.req.valid("json");
  const data = await withPool(
    c.env.DATABASE_URL,
    (promise) => c.executionCtx.waitUntil(promise),
    (pool) => runEffect(addRepoSvc(dbConnect(c.env.DATABASE_URL), pool, c.get("deps").scanRepo(c.env), accountId, body)),
  );
  return c.json({ data, error: null });
});

export default app;
