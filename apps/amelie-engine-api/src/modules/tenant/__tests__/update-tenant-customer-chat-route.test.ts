import { beforeAll, describe, expect, it } from "vitest";
import { Hono } from "hono";
import { TenantParamSchema, UpdateTenantCustomerChatBodySchema } from "@repo/contracts/amelie";
import { AppError } from "#/lib/errors";
import { zValidator } from "#/lib/zod-validator";
import type { DbConnectType } from "#/lib/db-connection";
import { runEffect } from "#/lib/effect-query";
import type { AppEnv } from "#/types/variables";
import { updateTenantCustomerChatAPI } from "#/modules/tenant/api";
import { getTenantSvc, updateTenantCustomerChatSvc } from "#/modules/tenant/handlers";
import { createTestDb, insertMember, insertPersonWithLogin, insertTenant } from "#/__tests__/amelie-test-db";

let db: DbConnectType;

const app = new Hono<AppEnv>();
app.onError((err, c) => {
  if (!(err instanceof AppError)) return c.json({ data: null, error: { code: "INTERNAL_ERROR", message: "" } }, 500);
  // SAFETY: AppError subclasses only use 4xx/5xx codes.
  return c.json({ data: null, error: { code: err.code, message: err.message } }, err.statusCode as 400);
});
app.use("*", async (c, next) => {
  c.set("userId", c.req.header("x-user-id") ?? "");
  await next();
});
app.put(
  "/tenants/:tenantId/customer-chat",
  zValidator("param", TenantParamSchema),
  zValidator("json", UpdateTenantCustomerChatBodySchema),
  async (c) => {
    const { customerChatLabel, customerChatAccent } = c.req.valid("json");
    const data = await runEffect(
      updateTenantCustomerChatSvc(db, c.get("userId"), c.req.valid("param").tenantId, customerChatLabel, customerChatAccent),
    );
    return c.json({ data, error: null });
  },
);

// SAFETY: the connection is injected, so no binding is read.
const env = { HYPERDRIVE_REALTIME: { connectionString: "unused" } } as never;

const put = (
  userId: string,
  tenantId: string,
  body: { customerChatLabel: string; customerChatAccent: string | null },
) =>
  app.request(
    `/tenants/${tenantId}/customer-chat`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json", "x-user-id": userId },
      body: JSON.stringify(body),
    },
    env,
  );

const newCafe = async (slug: string, role: "owner" | "manager" | "staff") => {
  const tenantId = await insertTenant(db, slug, slug);
  const login = await insertPersonWithLogin(db, `${role}@${slug}.test`);
  await insertMember(db, tenantId, login.partyId, role);
  return { tenantId, userId: login.userId };
};

beforeAll(async () => {
  db = await createTestDb();
});

describe("PUT /tenants/:tenantId/customer-chat", () => {
  it("answers 200 with the saved look for an owner", async () => {
    const { tenantId, userId } = await newCafe("chat-look-owner", "owner");

    const res = await put(userId, tenantId, {
      customerChatLabel: " Ask Sorella ",
      customerChatAccent: "#B4532A",
    });

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({
      data: { id: tenantId, customerChatLabel: "Ask Sorella", customerChatAccent: "#b4532a" },
      error: null,
    });
  });

  it("clears the colour when it is null", async () => {
    const { tenantId, userId } = await newCafe("chat-look-clear", "owner");
    await runEffect(updateTenantCustomerChatSvc(db, userId, tenantId, "Ask us", "#111111"));

    const res = await put(userId, tenantId, { customerChatLabel: "Ask us", customerChatAccent: null });

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ data: { customerChatAccent: null }, error: null });
  });

  it("answers 403 for staff and leaves the look unchanged", async () => {
    const { tenantId, userId } = await newCafe("chat-look-staff", "staff");

    const res = await put(userId, tenantId, { customerChatLabel: "Nope", customerChatAccent: "#ff0000" });

    expect(res.status).toBe(403);
    expect(await runEffect(getTenantSvc(db, userId, tenantId))).toMatchObject({
      customerChatLabel: "Chat with us",
      customerChatAccent: null,
    });
  });

  it("answers 404 for a Tenant the login is not a member of", async () => {
    const { tenantId } = await newCafe("chat-look-target", "owner");
    const outsider = await newCafe("chat-look-outsider", "owner");

    const res = await put(outsider.userId, tenantId, { customerChatLabel: "Steal", customerChatAccent: null });

    expect(res.status).toBe(404);
  });
});

describe("PUT /tenants/:tenantId/customer-chat on the real route", () => {
  const realApp = new Hono<AppEnv>();
  realApp.onError((err, c) => {
    if (!(err instanceof AppError)) return c.json({ data: null, error: { code: "INTERNAL_ERROR", message: "" } }, 500);
    // SAFETY: AppError subclasses only use 4xx/5xx codes.
    return c.json({ data: null, error: { code: err.code, message: err.message } }, err.statusCode as 400);
  });
  realApp.route("/tenants", updateTenantCustomerChatAPI);

  it("answers 400 before any database is read when the colour is rejected", async () => {
    const res = await realApp.request(
      "/tenants/00000000-0000-4000-8000-000000000000/customer-chat",
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerChatLabel: "Hi", customerChatAccent: "red" }),
      },
      env,
    );

    expect(res.status).toBe(400);
  });
});
