import { Hono } from "hono";
import { FindingTriageBodySchema, FindingsQuerySchema } from "@repo/contracts/elise";
import { dbConnect } from "#/lib/db-connection";
import { runEffect } from "#/lib/effect-query";
import { zValidator } from "#/lib/zod-validator";
import { listFindingsSvc, setFindingTriageSvc } from "#/modules/findings/handlers";
import { listFindingsDoc, setFindingTriageDoc } from "#/modules/findings/openapi";
import { AccountHeaderSchema } from "#/modules/scans/schemas";
import type { AppEnv } from "#/types/variables";

const app = new Hono<AppEnv>();

app.get("/", listFindingsDoc, zValidator("header", AccountHeaderSchema), zValidator("query", FindingsQuerySchema), async (c) => {
  const { "x-account-id": accountId } = c.req.valid("header");
  const data = await runEffect(listFindingsSvc(dbConnect(c.env.DATABASE_URL), accountId, c.req.valid("query")));
  return c.json({ data, error: null });
});

app.put("/triage", setFindingTriageDoc, zValidator("header", AccountHeaderSchema), zValidator("json", FindingTriageBodySchema), async (c) => {
  const { "x-account-id": accountId } = c.req.valid("header");
  const data = await runEffect(setFindingTriageSvc(dbConnect(c.env.DATABASE_URL), accountId, c.req.valid("json"), c.get("userId")));
  return c.json({ data, error: null });
});

export default app;
