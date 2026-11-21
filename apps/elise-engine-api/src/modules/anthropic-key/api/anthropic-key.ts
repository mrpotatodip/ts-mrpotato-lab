import { Hono } from "hono";
import { SetAnthropicKeyBodySchema } from "@repo/contracts/elise";
import { runEffect } from "#/lib/effect-query";
import { requirePower, userIdOf } from "#/lib/require-power";
import { tenantEffectOf } from "#/lib/tenant-effect";
import { zValidator } from "#/lib/zod-validator";
import { getAnthropicKeySvc, removeAnthropicKeySvc, setAnthropicKeySvc } from "#/modules/anthropic-key/handlers";
import { getAnthropicKeyDoc, removeAnthropicKeyDoc, setAnthropicKeyDoc } from "#/modules/anthropic-key/openapi";
import { notifyKeyChange } from "#/modules/anthropic-key/lib";
import { checkAnthropicKey } from "#/modules/anthropic-key/utils";
import { AccountHeaderSchema } from "#/modules/scans/schemas";
import type { AppEnv } from "#/types/variables";

const app = new Hono<AppEnv>();

app.get("/", getAnthropicKeyDoc, zValidator("header", AccountHeaderSchema), async (c) => {
  const { "x-account-id": accountId } = c.req.valid("header");
  const data = await c.get("deps").withTenant(c, accountId, (db) => runEffect(getAnthropicKeySvc(db, accountId)));
  return c.json({ data, error: null });
});

app.put("/", setAnthropicKeyDoc, requirePower("company:usage:anthropic_key:update"), zValidator("header", AccountHeaderSchema), zValidator("json", SetAnthropicKeyBodySchema), async (c) => {
  const { "x-account-id": accountId } = c.req.valid("header");
  const { apiKey } = c.req.valid("json");
  const userId = userIdOf(c);
  const data = await runEffect(setAnthropicKeySvc(c.env.KEY_ENCRYPTION_SECRET, tenantEffectOf(c, accountId), checkAnthropicKey, accountId, userId, apiKey));
  await notifyKeyChange(c, accountId, userId, "set");
  return c.json({ data, error: null });
});

app.delete("/", removeAnthropicKeyDoc, requirePower("company:usage:anthropic_key:update"), zValidator("header", AccountHeaderSchema), async (c) => {
  const { "x-account-id": accountId } = c.req.valid("header");
  const userId = userIdOf(c);
  const { key, removed } = await c.get("deps").withTenant(c, accountId, (db) => runEffect(removeAnthropicKeySvc(db, accountId, userId)));
  if (removed) await notifyKeyChange(c, accountId, userId, "removed");
  return c.json({ data: key, error: null });
});

export default app;
