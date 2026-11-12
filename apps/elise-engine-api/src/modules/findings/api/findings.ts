import { Hono } from "hono";
import { FindingTriageBodySchema, FindingsQuerySchema } from "@repo/contracts/elise";
import { dbConnect, withPool } from "#/lib/db-connection";
import { runEffect } from "#/lib/effect-query";
import { assertPower } from "#/lib/require-power";
import { zValidator } from "#/lib/zod-validator";
import { listFindingsSvc, setFindingTriageSvc } from "#/modules/findings/handlers";
import { listFindingsDoc, setFindingTriageDoc } from "#/modules/findings/openapi";
import { AccountHeaderSchema } from "#/modules/scans/schemas";
import type { AppEnv } from "#/types/variables";

const app = new Hono<AppEnv>();

app.get("/", listFindingsDoc, zValidator("header", AccountHeaderSchema), zValidator("query", FindingsQuerySchema), async (c) => {
  const { "x-account-id": accountId } = c.req.valid("header");
  const query = c.req.valid("query");
  const data = await c.get("deps").withTenant(c, accountId, (db) => runEffect(listFindingsSvc(db, accountId, query)));
  return c.json({ data, error: null });
});

app.put("/triage", setFindingTriageDoc, zValidator("header", AccountHeaderSchema), zValidator("json", FindingTriageBodySchema), async (c) => {
  const { "x-account-id": accountId } = c.req.valid("header");
  const body = c.req.valid("json");
  const userId = body.status === "accepted_risk" ? await assertPower(c, "company:findings:accepted_risk:update") : c.get("userId");
  const data = await withPool(
    c.env.DATABASE_URL,
    (promise) => c.executionCtx.waitUntil(promise),
    (pool) => runEffect(setFindingTriageSvc(dbConnect(c.env.DATABASE_URL), pool, accountId, body, userId)),
  );
  return c.json({ data, error: null });
});

export default app;
