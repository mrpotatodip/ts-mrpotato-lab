import { Hono } from "hono";
import { runEffect } from "#/lib/effect-query";
import { requireTenantManager, userIdOf } from "#/lib/require-tenant-manager";
import { zValidator } from "#/lib/zod-validator";
import { githubConnectUrlSvc } from "#/modules/github-installs/handlers";
import { githubPortFor } from "#/modules/github-installs/lib";
import { connectGithubDoc } from "#/modules/github-installs/openapi";
import { AccountHeaderSchema } from "#/modules/scans/schemas";
import type { AppEnv } from "#/types/variables";

const app = new Hono<AppEnv>();

app.post("/connect", connectGithubDoc, requireTenantManager, zValidator("header", AccountHeaderSchema), async (c) => {
  const { "x-account-id": accountId } = c.req.valid("header");
  const data = await runEffect(githubConnectUrlSvc(githubPortFor(c.env), c.env.AUTH_SECRET, accountId, userIdOf(c), Date.now()));
  return c.json({ data, error: null });
});

export default app;
