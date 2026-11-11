import { Hono } from "hono";
import { SetAnthropicKeyBodySchema } from "@repo/contracts/elise";
import { dbConnect, withPool } from "#/lib/db-connection";
import { runEffect } from "#/lib/effect-query";
import { requirePower, userIdOf } from "#/lib/require-power";
import { zValidator } from "#/lib/zod-validator";
import { getAnthropicKeySvc, removeAnthropicKeySvc, setAnthropicKeySvc } from "#/modules/anthropic-key/handlers";
import { getAnthropicKeyDoc, removeAnthropicKeyDoc, setAnthropicKeyDoc } from "#/modules/anthropic-key/openapi";
import { checkAnthropicKey } from "#/modules/anthropic-key/utils";
import { AccountHeaderSchema } from "#/modules/scans/schemas";
import type { AppEnv } from "#/types/variables";

const app = new Hono<AppEnv>();

app.get("/", getAnthropicKeyDoc, zValidator("header", AccountHeaderSchema), async (c) => {
  const { "x-account-id": accountId } = c.req.valid("header");
  const data = await runEffect(getAnthropicKeySvc(dbConnect(c.env.DATABASE_URL), accountId));
  return c.json({ data, error: null });
});

app.put("/", setAnthropicKeyDoc, requirePower("company:usage:anthropic_key:update"), zValidator("header", AccountHeaderSchema), zValidator("json", SetAnthropicKeyBodySchema), async (c) => {
  const { "x-account-id": accountId } = c.req.valid("header");
  const { apiKey } = c.req.valid("json");
  const userId = userIdOf(c);
  const data = await withPool(
    c.env.DATABASE_URL,
    (promise) => c.executionCtx.waitUntil(promise),
    (db) => runEffect(setAnthropicKeySvc(c.env.KEY_ENCRYPTION_SECRET, db, checkAnthropicKey, accountId, userId, apiKey)),
  );
  return c.json({ data, error: null });
});

app.delete("/", removeAnthropicKeyDoc, requirePower("company:usage:anthropic_key:update"), zValidator("header", AccountHeaderSchema), async (c) => {
  const { "x-account-id": accountId } = c.req.valid("header");
  const userId = userIdOf(c);
  const data = await withPool(
    c.env.DATABASE_URL,
    (promise) => c.executionCtx.waitUntil(promise),
    (db) => runEffect(removeAnthropicKeySvc(db, accountId, userId)),
  );
  return c.json({ data, error: null });
});

export default app;
