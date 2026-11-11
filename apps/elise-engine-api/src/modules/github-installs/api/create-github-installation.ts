import { Hono } from "hono";
import { ConnectGithubBodySchema } from "@repo/contracts/elise";
import { withPool } from "#/lib/db-connection";
import { runEffect } from "#/lib/effect-query";
import { requirePower, userIdOf } from "#/lib/require-power";
import { zValidator } from "#/lib/zod-validator";
import { connectGithubSvc } from "#/modules/github-installs/handlers";
import { githubPortFor } from "#/modules/github-installs/lib";
import { createGithubInstallationDoc } from "#/modules/github-installs/openapi";
import { AccountHeaderSchema } from "#/modules/scans/schemas";
import type { AppEnv } from "#/types/variables";

const app = new Hono<AppEnv>();

app.post("/installations", createGithubInstallationDoc, requirePower("company:github:installations:create"), zValidator("header", AccountHeaderSchema), zValidator("json", ConnectGithubBodySchema), async (c) => {
  const { "x-account-id": accountId } = c.req.valid("header");
  const body = c.req.valid("json");
  const userId = userIdOf(c);
  const data = await withPool(
    c.env.DATABASE_URL,
    (promise) => c.executionCtx.waitUntil(promise),
    (db) => runEffect(connectGithubSvc(db, githubPortFor(c.env), c.env.AUTH_SECRET, accountId, userId, body, new Date())),
  );
  return c.json({ data, error: null }, 201);
});

export default app;
