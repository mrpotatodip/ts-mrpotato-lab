import { Hono } from "hono";
import { RunnerParamSchema } from "@repo/contracts/elise";
import { dbConnect } from "#/lib/db-connection";
import { runEffect } from "#/lib/effect-query";
import { zValidator } from "#/lib/zod-validator";
import { removeRunnerSvc } from "#/modules/runners/handlers";
import { requireAccountMember } from "#/modules/runners/lib";
import { removeRunnerDoc } from "#/modules/runners/openapi";
import { AccountHeaderSchema } from "#/modules/scans/schemas";
import type { AppEnv } from "#/types/variables";

const app = new Hono<AppEnv>();

app.delete("/:runnerId", removeRunnerDoc, requireAccountMember, zValidator("header", AccountHeaderSchema), zValidator("param", RunnerParamSchema), async (c) => {
  const { "x-account-id": accountId } = c.req.valid("header");
  const { runnerId } = c.req.valid("param");
  const data = await runEffect(removeRunnerSvc(dbConnect(c.env.DATABASE_URL), accountId, runnerId));
  return c.json({ data, error: null });
});

export default app;
