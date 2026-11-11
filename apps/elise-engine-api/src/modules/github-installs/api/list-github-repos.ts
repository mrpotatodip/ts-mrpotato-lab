import { Hono } from "hono";
import { dbConnect } from "#/lib/db-connection";
import { runEffect } from "#/lib/effect-query";
import { requireScanAccess } from "#/lib/require-scan-access";
import { zValidator } from "#/lib/zod-validator";
import { listGithubReposSvc } from "#/modules/github-installs/handlers";
import { githubPortFor } from "#/modules/github-installs/lib";
import { listGithubReposDoc } from "#/modules/github-installs/openapi";
import { AccountHeaderSchema } from "#/modules/scans/schemas";
import type { AppEnv } from "#/types/variables";

const app = new Hono<AppEnv>();

app.get("/repos", listGithubReposDoc, requireScanAccess, zValidator("header", AccountHeaderSchema), async (c) => {
  const { "x-account-id": accountId } = c.req.valid("header");
  const data = await runEffect(listGithubReposSvc(dbConnect(c.env.DATABASE_URL), githubPortFor(c.env), accountId));
  return c.json({ data, error: null });
});

export default app;
