import { beforeAll, describe, expect, it } from "vitest";
import { Hono } from "hono";
import { TenantParamSchema, UpdateTenantRegionBodySchema } from "@repo/contracts/amelie";
import { AppError } from "#/lib/errors";
import { zValidator } from "#/lib/zod-validator";
import type { DbConnectType } from "#/lib/db-connection";
import { runEffect } from "#/lib/effect-query";
import type { AppEnv } from "#/types/variables";
import { updateTenantRegionAPI } from "#/modules/tenant/api";
import { getTenantSvc, updateTenantRegionSvc } from "#/modules/tenant/handlers";
import { createTestDb, insertCountry, insertMember, insertPersonWithLogin, insertTenant } from "#/__tests__/amelie-test-db";

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
  "/tenants/:tenantId/region",
  zValidator("param", TenantParamSchema),
  zValidator("json", UpdateTenantRegionBodySchema),
  async (c) => {
    const data = await runEffect(
      updateTenantRegionSvc(db, c.get("userId"), c.req.valid("param").tenantId, c.req.valid("json")),
    );
    return c.json({ data, error: null });
  },
);

// SAFETY: the connection is injected, so no binding is read.
const env = { HYPERDRIVE_REALTIME: { connectionString: "unused" } } as never;

const patch = (userId: string, tenantId: string, body: Record<string, string>) =>
  app.request(
    `/tenants/${tenantId}/region`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-user-id": userId },
      body: JSON.stringify(body),
    },
    env,
  );

const newCafe = async (slug: string, role: "tenant_admin" | "store_admin" | "store_staff") => {
  const tenantId = await insertTenant(db, slug, slug);
  const login = await insertPersonWithLogin(db, `${role}@${slug}.test`);
  await insertMember(db, tenantId, login.partyId, role);
  return { tenantId, userId: login.userId };
};

beforeAll(async () => {
  db = await createTestDb();
});

describe("PATCH /tenants/:tenantId/region", () => {
  it("answers 200 with the saved region for an owner", async () => {
    const { tenantId, userId } = await newCafe("route-owner", "tenant_admin");

    const res = await patch(userId, tenantId, { country: "PH", currency: "PHP" });

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ data: { id: tenantId, country: "PH", currency: "PHP" }, error: null });
  });

  it("answers 403 for staff and leaves the region unchanged", async () => {
    const { tenantId, userId } = await newCafe("route-staff", "store_staff");

    const res = await patch(userId, tenantId, { country: "PH", currency: "PHP" });

    expect(res.status).toBe(403);
    expect(await res.json()).toMatchObject({ data: null, error: { code: "FORBIDDEN" } });
    expect(await runEffect(getTenantSvc(db, userId, tenantId))).toMatchObject({ country: "US", currency: "USD" });
  });

  it("answers 404 for a Tenant the login is not a member of", async () => {
    const { tenantId } = await newCafe("route-target", "tenant_admin");
    const outsider = await newCafe("route-outsider", "tenant_admin");

    const res = await patch(outsider.userId, tenantId, { country: "PH", currency: "PHP" });

    expect(res.status).toBe(404);
  });

  it("answers 409 pointing at the Countries settings when the café sells in 2 or more Countries, and changes nothing", async () => {
    const { tenantId, userId } = await newCafe("route-many", "tenant_admin");
    await insertCountry(db, tenantId, { country: "CA", currency: "CAD" });

    const res = await patch(userId, tenantId, { country: "PH", currency: "PHP" });

    expect(res.status).toBe(409);
    expect(await res.json()).toMatchObject({ data: null, error: { message: expect.stringMatching(/countries/i) } });
    expect(await runEffect(getTenantSvc(db, userId, tenantId))).toMatchObject({ country: "US", currency: "USD" });
  });

  it("still edits the only open Country when another is archived", async () => {
    const { tenantId, userId } = await newCafe("route-one-open", "tenant_admin");
    await insertCountry(db, tenantId, { country: "CA", currency: "CAD", archivedAt: new Date() });

    const res = await patch(userId, tenantId, { country: "PH", currency: "PHP" });

    expect(res.status).toBe(200);
  });

  it.each([
    { country: "ZZ", currency: "PHP" },
    { country: "PH", currency: "XXX" },
  ])("answers 400 for $country / $currency, outside the shared lists", async (body) => {
    const { tenantId, userId } = await newCafe(`route-bad-${body.country}-${body.currency}`.toLowerCase(), "tenant_admin");

    const res = await patch(userId, tenantId, body);

    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ data: null, error: { code: "VALIDATION_ERROR" } });
  });
});

describe("PATCH /tenants/:tenantId/region on the real route", () => {
  const realApp = new Hono<AppEnv>();
  realApp.onError((err, c) => {
    if (!(err instanceof AppError)) return c.json({ data: null, error: { code: "INTERNAL_ERROR", message: "" } }, 500);
    // SAFETY: AppError subclasses only use 4xx/5xx codes.
    return c.json({ data: null, error: { code: err.code, message: err.message } }, err.statusCode as 400);
  });
  realApp.route("/tenants", updateTenantRegionAPI);

  it("answers 400 before any database is read when the body is outside the shared lists", async () => {
    const res = await realApp.request(
      "/tenants/00000000-0000-4000-8000-000000000000/region",
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ country: "ZZ", currency: "XXX" }),
      },
      env,
    );

    expect(res.status).toBe(400);
  });
});
