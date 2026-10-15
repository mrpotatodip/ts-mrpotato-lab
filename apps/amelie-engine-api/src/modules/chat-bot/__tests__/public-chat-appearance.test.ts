import { beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { tenants } from "@repo/db-amelie";
import { Hono } from "hono";
import { PublicChatAppearanceQuerySchema } from "@repo/contracts/amelie";
import { AppError } from "#/lib/errors";
import { zValidator } from "#/lib/zod-validator";
import type { DbConnectType } from "#/lib/db-connection";
import { runEffect } from "#/lib/effect-query";
import type { AppEnv } from "#/types/variables";
import { getPublicChatAppearanceSvc } from "#/modules/chat-bot/handlers";
import { createTestDb, insertTenant } from "#/__tests__/amelie-test-db";

let db: DbConnectType;
let listedId: string;

const app = new Hono<AppEnv>();
app.onError((err, c) => {
  if (!(err instanceof AppError)) return c.json({ data: null, error: { code: "INTERNAL_ERROR", message: "" } }, 500);
  // SAFETY: AppError subclasses only use 4xx/5xx codes.
  return c.json({ data: null, error: { code: err.code, message: err.message } }, err.statusCode as 400);
});
app.get("/public/chat-bot/appearance", zValidator("query", PublicChatAppearanceQuerySchema), async (c) => {
  const data = await runEffect(getPublicChatAppearanceSvc(db, c.req.valid("query").slug));
  return c.json({ data, error: null });
});

// SAFETY: the connection is injected, so no binding is read.
const env = { HYPERDRIVE_REALTIME: { connectionString: "unused" } } as never;

const getAppearance = (slug: string) =>
  app.request(`/public/chat-bot/appearance?slug=${encodeURIComponent(slug)}`, {}, env);

beforeAll(async () => {
  db = await createTestDb();
  listedId = await insertTenant(db, "Sorella Cafe", "sorella");
  await db
    .update(tenants)
    .set({ customerChatLabel: "Ask Sorella", customerChatAccent: "#b4532a" })
    .where(eq(tenants.id, listedId));
  await insertTenant(db, "Plain Cafe", "plain");
});

describe("GET /public/chat-bot/appearance", () => {
  it("returns the Tenant's Customer chat look and never a Tenant id", async () => {
    const res = await getAppearance("sorella");
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({
      data: { customerChatLabel: "Ask Sorella", customerChatAccent: "#b4532a" },
      error: null,
    });
    expect(body.data).not.toHaveProperty("id");
    expect(JSON.stringify(body)).not.toContain(listedId);
  });

  it("returns the default look when the Tenant has not set a colour", async () => {
    const res = await getAppearance("plain");

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      data: { customerChatLabel: "Chat with us", customerChatAccent: null },
      error: null,
    });
  });

  it("answers 404 for an unknown slug", async () => {
    const res = await getAppearance("not-a-cafe");

    expect(res.status).toBe(404);
    expect(await res.json()).toMatchObject({ data: null, error: { code: "NOT_FOUND" } });
  });
});
