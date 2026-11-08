import { Hono } from "hono";
import { RepoParamSchema, VerdictQuerySchema } from "@repo/contracts/elise";
import { dbConnect } from "#/lib/db-connection";
import { runEffect } from "#/lib/effect-query";
import { zValidator } from "#/lib/zod-validator";
import { AccountHeaderSchema } from "#/modules/scans/schemas";
import { verdictSvc } from "#/modules/verdict/handlers";
import { getVerdictDoc } from "#/modules/verdict/openapi";
import type { AppEnv } from "#/types/variables";

const app = new Hono<AppEnv>();

app.get("/:repoId/verdict", getVerdictDoc, zValidator("header", AccountHeaderSchema), zValidator("param", RepoParamSchema), zValidator("query", VerdictQuerySchema), async (c) => {
  const { "x-account-id": accountId } = c.req.valid("header");
  const { repoId } = c.req.valid("param");
  const { commit } = c.req.valid("query");
  const data = await runEffect(verdictSvc(dbConnect(c.env.DATABASE_URL), accountId, repoId, commit, new Date()));
  return c.json({ data, error: null });
});

export default app;
