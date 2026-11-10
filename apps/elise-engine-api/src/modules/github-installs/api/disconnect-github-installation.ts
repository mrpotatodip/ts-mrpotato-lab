import { Hono } from "hono";
import { GithubInstallationParamSchema } from "@repo/contracts/elise";
import { withPool } from "#/lib/db-connection";
import { runEffect } from "#/lib/effect-query";
import { requireTenantManager, userIdOf } from "#/lib/require-tenant-manager";
import { zValidator } from "#/lib/zod-validator";
import { disconnectGithubSvc } from "#/modules/github-installs/handlers";
import { disconnectGithubInstallationDoc } from "#/modules/github-installs/openapi";
import { AccountHeaderSchema } from "#/modules/scans/schemas";
import type { AppEnv } from "#/types/variables";

const app = new Hono<AppEnv>();

app.delete("/installations/:id", disconnectGithubInstallationDoc, requireTenantManager, zValidator("header", AccountHeaderSchema), zValidator("param", GithubInstallationParamSchema), async (c) => {
  const { "x-account-id": accountId } = c.req.valid("header");
  const { id } = c.req.valid("param");
  const userId = userIdOf(c);
  const data = await withPool(
    c.env.DATABASE_URL,
    (promise) => c.executionCtx.waitUntil(promise),
    (db) => runEffect(disconnectGithubSvc(db, accountId, userId, id)),
  );
  return c.json({ data, error: null });
});

export default app;
