import { beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { tenants } from "@repo/db-amelie";
import { Hono } from "hono";
import { PublicChatFramePolicyQuerySchema } from "@repo/contracts/amelie";
import { AppError } from "#/lib/errors";
import { zValidator } from "#/lib/zod-validator";
import type { DbConnectType } from "#/lib/db-connection";
import { runEffect } from "#/lib/effect-query";
import type { AppEnv } from "#/types/variables";
import { getPublicChatFramePolicySvc } from "#/modules/chat-bot/handlers";
import { createTestDb, insertTenant } from "#/__tests__/amelie-test-db";

let db: DbConnectType;
let listedId: string;

const app = new Hono<AppEnv>();
app.onError((err, c) => {
  if (!(err instanceof AppError)) return c.json({ data: null, error: { code: "INTERNAL_ERROR", message: "" } }, 500);
  // SAFETY: AppError subclasses only use 4xx/5xx codes.
  return c.json({ data: null, error: { code: err.code, message: err.message } }, err.statusCode as 400);
});
app.get("/public/chat-bot/frame-policy", zValidator("query", PublicChatFramePolicyQuerySchema), async (c) => {
  const data = await runEffect(getPublicChatFramePolicySvc(db, c.req.valid("query").slug));
  return c.json({ data, error: null });
});

// SAFETY: the connection is injected, so no binding is read.
const env = { HYPERDRIVE_REALTIME: { connectionString: "unused" } } as never;

const getPolicy = (slug: string) =>
  app.request(`/public/chat-bot/frame-policy?slug=${encodeURIComponent(slug)}`, {}, env);

beforeAll(async () => {
  db = await createTestDb();
  listedId = await insertTenant(db, "Sorella Cafe", "sorella");
  await db.update(tenants).set({ allowedOrigins: ["https://sorellacafe.com/menu"] }).where(eq(tenants.id, listedId));
  await insertTenant(db, "Empty Origins Cafe", "empty-origins");
});

describe("GET /public/chat-bot/frame-policy", () => {
  it("returns the Tenant's Allowed origins and never a Tenant id", async () => {
    const res = await getPolicy("sorella");
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ data: { allowedOrigins: ["https://sorellacafe.com/menu"] }, error: null });
    expect(body.data).not.toHaveProperty("id");
    expect(JSON.stringify(body)).not.toContain(listedId);
  });

  it("returns an empty list when the Tenant has no Allowed origins", async () => {
    const res = await getPolicy("empty-origins");

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ data: { allowedOrigins: [] }, error: null });
  });

  it("answers 404 for an unknown slug", async () => {
    const res = await getPolicy("not-a-cafe");

    expect(res.status).toBe(404);
    expect(await res.json()).toMatchObject({ data: null, error: { code: "NOT_FOUND" } });
  });
});
