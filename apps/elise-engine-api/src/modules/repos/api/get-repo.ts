import { Hono } from "hono";
import { RepoParamSchema } from "@repo/contracts/elise";
import { dbConnect } from "#/lib/db-connection";
import { runEffect } from "#/lib/effect-query";
import { zValidator } from "#/lib/zod-validator";
import { getRepoSvc } from "#/modules/repos/handlers";
import { getRepoDoc } from "#/modules/repos/openapi";
import { AccountHeaderSchema } from "#/modules/scans/schemas";
import type { AppEnv } from "#/types/variables";

const app = new Hono<AppEnv>();

app.get("/:repoId", getRepoDoc, zValidator("header", AccountHeaderSchema), zValidator("param", RepoParamSchema), async (c) => {
  const { "x-account-id": accountId } = c.req.valid("header");
  const { repoId } = c.req.valid("param");
  const data = await runEffect(getRepoSvc(dbConnect(c.env.DATABASE_URL), c.get("deps").scanRepo(c.env), accountId, repoId));
  return c.json({ data, error: null });
});

export default app;
