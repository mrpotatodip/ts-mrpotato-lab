import { Effect } from "effect";
import { Hono } from "hono";
import { dbConnect } from "#/lib/db-connection";
import { runEffect, toDbError } from "#/lib/effect-query";
import { findConnectedRunnerEffect } from "#/modules/runners/queries";
import type { HoldCredit, ReleaseCredit } from "#/modules/credit";
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
  const release: ReleaseCredit = (scanId) => Effect.tryPromise({ try: () => deps.releaseCredit(c.env, accountId, scanId), catch: toDbError });
  const runnerConnected = (runnerId: string) => findConnectedRunnerEffect(dbConnect(c.env.DATABASE_URL), accountId, runnerId);
  const data = await runEffect(createScanSvc(c.env, deps.scanRepo(c.env), accountId, body, spend, deps.githubAccess(c.env, accountId), hold, runnerConnected, release));
  return c.json({ data, error: null }, 201);
});

export default app;
