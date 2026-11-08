import { Hono } from "hono";
import { RepoFindingsQuerySchema, RepoParamSchema } from "@repo/contracts/elise";
import { dbConnect } from "#/lib/db-connection";
import { runEffect } from "#/lib/effect-query";
import { zValidator } from "#/lib/zod-validator";
import { listRepoFindingsSvc } from "#/modules/repos/handlers";
import { listRepoFindingsDoc } from "#/modules/repos/openapi";
import { AccountHeaderSchema } from "#/modules/scans/schemas";
import type { AppEnv } from "#/types/variables";

const app = new Hono<AppEnv>();

app.get(
  "/:repoId/findings",
  listRepoFindingsDoc,
  zValidator("header", AccountHeaderSchema),
  zValidator("param", RepoParamSchema),
  zValidator("query", RepoFindingsQuerySchema),
  async (c) => {
    const { "x-account-id": accountId } = c.req.valid("header");
    const { repoId } = c.req.valid("param");
    const data = await runEffect(listRepoFindingsSvc(dbConnect(c.env.DATABASE_URL), accountId, repoId, c.req.valid("query")));
    return c.json({ data, error: null });
  },
);

export default app;
