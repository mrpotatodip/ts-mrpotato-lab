import { beforeAll, describe, expect, it } from "vitest";
import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { tenants } from "@repo/db-amelie";
import { TenantParamSchema, UpdateTenantAllowedOriginsBodySchema } from "@repo/contracts/amelie";
import { AppError } from "#/lib/errors";
import { zValidator } from "#/lib/zod-validator";
import type { DbConnectType } from "#/lib/db-connection";
import { runEffect } from "#/lib/effect-query";
import type { AppEnv } from "#/types/variables";
import { updateTenantAllowedOriginsAPI } from "#/modules/tenant/api";
import { getTenantSvc, updateTenantAllowedOriginsSvc } from "#/modules/tenant/handlers";
import { getTenantProfileSvc } from "#/modules/business-profile/handlers";
import { upsertBusinessProfileEffect } from "#/modules/business-profile/queries";
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
app.patch(
  "/tenants/:tenantId/allowed-origins",
  zValidator("param", TenantParamSchema),
  zValidator("json", UpdateTenantAllowedOriginsBodySchema),
  async (c) => {
    const data = await runEffect(
      updateTenantAllowedOriginsSvc(db, c.get("userId"), c.req.valid("param").tenantId, c.req.valid("json")),
    );
    return c.json({ data, error: null });
  },
);

// SAFETY: the connection is injected, so no binding is read.
const env = { HYPERDRIVE_REALTIME: { connectionString: "unused" } } as never;

const patch = (userId: string, tenantId: string, body: { allowedOrigins: string[] }) =>
  app.request(
    `/tenants/${tenantId}/allowed-origins`,
    {
      method: "PATCH",
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

const seedOrigins = (tenantId: string, allowedOrigins: string[]) =>
  db.update(tenants).set({ allowedOrigins }).where(eq(tenants.id, tenantId));

beforeAll(async () => {
  db = await createTestDb();
});

describe("PATCH /tenants/:tenantId/allowed-origins", () => {
  it("answers 200 with origins taken from pasted site URLs for an owner", async () => {
    const { tenantId, userId } = await newCafe("origins-owner", "owner");

    const res = await patch(userId, tenantId, { allowedOrigins: ["https://sorellacafe.com/menu"] });

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({
      data: { id: tenantId, allowedOrigins: ["https://sorellacafe.com"] },
      error: null,
    });
  });

  it("drops duplicate origins and keeps the order they were saved", async () => {
    const { tenantId, userId } = await newCafe("origins-dupes", "owner");

    const res = await patch(userId, tenantId, {
      allowedOrigins: [
        "https://b.example/path",
        "https://a.example",
        "https://b.example/other",
        "http://localhost:5174",
      ],
    });

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({
      data: {
        allowedOrigins: ["https://b.example", "https://a.example", "http://localhost:5174"],
      },
      error: null,
    });
  });

  it("answers 200 with an empty list", async () => {
    const { tenantId, userId } = await newCafe("origins-empty", "owner");
    await seedOrigins(tenantId, ["https://sorellacafe.com"]);

    const res = await patch(userId, tenantId, { allowedOrigins: [] });

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ data: { allowedOrigins: [] }, error: null });
  });

  it.each(["*", "ftp://files.example", "not a url", "javascript:alert(1)"])(
    "answers 400 for %s and leaves the previous list unchanged",
    async (row) => {
      const { tenantId, userId } = await newCafe(`origins-bad-${row.slice(0, 8).replace(/\W/g, "")}`, "owner");
      await seedOrigins(tenantId, ["https://sorellacafe.com"]);

      const res = await patch(userId, tenantId, { allowedOrigins: ["https://ok.example", row] });

      expect(res.status).toBe(400);
      expect(await res.json()).toMatchObject({ data: null, error: { code: "VALIDATION_ERROR" } });
      expect(await runEffect(getTenantSvc(db, userId, tenantId))).toMatchObject({
        allowedOrigins: ["https://sorellacafe.com"],
      });
    },
  );

  it("answers 400 when more than 20 unique origins are sent, and leaves the previous list unchanged", async () => {
    const { tenantId, userId } = await newCafe("origins-too-many", "owner");
    await seedOrigins(tenantId, ["https://sorellacafe.com"]);
    const allowedOrigins = Array.from({ length: 21 }, (_, i) => `https://cafe-${i}.example`);

    const res = await patch(userId, tenantId, { allowedOrigins });

    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ data: null, error: { code: "VALIDATION_ERROR" } });
    expect(await runEffect(getTenantSvc(db, userId, tenantId))).toMatchObject({
      allowedOrigins: ["https://sorellacafe.com"],
    });
  });

  it("answers 403 for staff and leaves Allowed origins unchanged", async () => {
    const { tenantId, userId } = await newCafe("origins-staff", "staff");
    await seedOrigins(tenantId, ["https://sorellacafe.com"]);

    const res = await patch(userId, tenantId, { allowedOrigins: ["https://other.example"] });

    expect(res.status).toBe(403);
    expect(await res.json()).toMatchObject({ data: null, error: { code: "FORBIDDEN" } });
    expect(await runEffect(getTenantSvc(db, userId, tenantId))).toMatchObject({
      allowedOrigins: ["https://sorellacafe.com"],
    });
  });

  it("answers 404 for a Tenant the login is not a member of", async () => {
    const { tenantId } = await newCafe("origins-target", "owner");
    const outsider = await newCafe("origins-outsider", "owner");

    const res = await patch(outsider.userId, tenantId, { allowedOrigins: ["https://other.example"] });

    expect(res.status).toBe(404);
  });

  it("does not change the Business profile website", async () => {
    const { tenantId, userId } = await newCafe("origins-website", "owner");
    await runEffect(upsertBusinessProfileEffect(db, tenantId, { websiteUrl: "https://contact.example" }));

    const res = await patch(userId, tenantId, { allowedOrigins: ["https://embed.example"] });

    expect(res.status).toBe(200);
    expect(await runEffect(getTenantProfileSvc(db, tenantId))).toMatchObject({
      websiteUrl: "https://contact.example",
    });
  });
});

describe("PATCH /tenants/:tenantId/allowed-origins on the real route", () => {
  const realApp = new Hono<AppEnv>();
  realApp.onError((err, c) => {
    if (!(err instanceof AppError)) return c.json({ data: null, error: { code: "INTERNAL_ERROR", message: "" } }, 500);
    // SAFETY: AppError subclasses only use 4xx/5xx codes.
    return c.json({ data: null, error: { code: err.code, message: err.message } }, err.statusCode as 400);
  });
  realApp.route("/tenants", updateTenantAllowedOriginsAPI);

  it("answers 400 before any database is read when a row is not an http or https origin", async () => {
    const res = await realApp.request(
      "/tenants/00000000-0000-4000-8000-000000000000/allowed-origins",
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ allowedOrigins: ["*"] }),
      },
      env,
    );

    expect(res.status).toBe(400);
  });
});

