import { Effect } from "effect";
import { Hono } from "hono";
import { runEffect, toDbError } from "#/lib/effect-query";
import type { HoldCredit } from "#/modules/credit";
import { zValidator } from "#/lib/zod-validator";
import type { AppEnv } from "#/types/variables";
import { createScanSvc } from "#/modules/scans/handlers";
import { createScanDoc } from "#/modules/scans/openapi";
import { AccountHeaderSchema, CreateScanBodySchema } from "#/modules/scans/schemas";

const app = new Hono<AppEnv>();

app.post("/", createScanDoc, zValidator("header", AccountHeaderSchema), zValidator("json", CreateScanBodySchema), async (c) => {
  const { "x-account-id": accountId } = c.req.valid("header");
  const body = c.req.valid("json");
  const spend = await c.get("deps").monthSpend(c.env, accountId);
  const deps = c.get("deps");
  const hold: HoldCredit = (scanId, holdUsd) => Effect.tryPromise({ try: () => deps.holdCredit(c.env, accountId, scanId, holdUsd), catch: toDbError });
  const data = await runEffect(createScanSvc(c.env, deps.scanRepo(c.env), accountId, body, spend, deps.githubAccess(c.env, accountId), hold));
  return c.json({ data, error: null }, 201);
});

export default app;
