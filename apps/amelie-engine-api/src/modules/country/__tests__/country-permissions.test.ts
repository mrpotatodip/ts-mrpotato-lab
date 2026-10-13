import { beforeAll, describe, expect, it } from "vitest";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
import { Hono } from "hono";
import { AppError } from "#/lib/errors";
import type { AppEnv } from "#/types/variables";
import countryRestAPI from "#/modules/country/routes";
import { requireTenantMember } from "#/modules/tenant";
import {
  createTestPglite,
  insertCountry,
  insertMember,
  insertPersonWithLogin,
  insertTenant,
} from "#/__tests__/amelie-test-db";

// -----
// Same setup as the Location permissions test: the
// routes open their own connection, so the database
// is served over a socket; the session is faked by a
// header and the Tenant and Role checks are real.
// -----
type TestUsers = { owner: string; manager: string; staff: string };

let tenantId: string;
let spareCountryId: string;
let connectionString: string;
const users: TestUsers = { owner: "", manager: "", staff: "" };

const app = new Hono<AppEnv>();
app.onError((err, c) => {
  if (err instanceof AppError) {
    // SAFETY: AppError subclasses only use 4xx/5xx codes.
    return c.json({ data: null, error: { code: err.code, message: err.message } }, err.statusCode as 403);
  }
  throw err;
});
for (const path of ["/countries", "/countries/*"]) {
  app.use(path, async (c, next) => {
    c.set("userId", c.req.header("X-Test-User") ?? "");
    await next();
  });
  app.use(path, requireTenantMember);
}
app.route("/countries", countryRestAPI);

type RouteBody = Record<string, string>;

const call = (as: keyof TestUsers, method: string, path: string, body?: RouteBody) =>
  app.fetch(
    new Request(`http://localhost/countries${path}?tenantId=${tenantId}`, {
      method,
      headers: { "X-Test-User": users[as], "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    }),
    // SAFETY: these routes read only HYPERDRIVE_REALTIME from the bindings.
    { HYPERDRIVE_REALTIME: { connectionString } } as never,
  );

beforeAll(async () => {
  const { pg, db } = await createTestPglite();
  const server = new PGLiteSocketServer({ db: pg, port: 0, maxConnections: 50 });
  await server.start();
  connectionString = `postgresql://postgres@${server.getServerConn()}/postgres`;
  tenantId = await insertTenant(db, "Sorella", "sorella");
  spareCountryId = await insertCountry(db, tenantId, { country: "MX", currency: "MXN" });
  for (const role of ["owner", "manager", "staff"] as const) {
    const login = await insertPersonWithLogin(db, `${role}@test`);
    await insertMember(db, tenantId, login.partyId, role);
    users[role] = login.userId;
  }
});

describe("Country routes by Role", () => {
  it("lets staff read the Countries, archived ones included", async () => {
    const res = await call("staff", "GET", "");

    expect(res.status).toBe(200);
    const { data } = await res.json();
    expect(data.map((c: { country: string }) => c.country)).toEqual(["US", "MX"]);
  });

  it.each([
    ["adding a Country", "POST", "", { country: "CA", currency: "CAD" }],
    ["editing a Country", "PATCH", "/COUNTRY", { currency: "USD" }],
    ["archiving a Country", "POST", "/COUNTRY/archive", undefined],
  ])("keeps staff (can_edit false) out of %s with a 403", async (_label, method, path, body) => {
    const res = await call("staff", method, path.replace("COUNTRY", spareCountryId), body);

    expect(res.status).toBe(403);
  });

  it.each([
    ["owner", "CA", "CAD"],
    ["manager", "FR", "EUR"],
  ] as const)("lets a %s add, edit and archive a Country", async (role, code, currency) => {
    const added = await call(role, "POST", "", { country: code, currency });
    expect(added.status).toBe(201);
    const { data } = await added.json();
    expect(data).toMatchObject({ country: code, currency, archivedAt: null });

    const edited = await call(role, "PATCH", `/${data.id}`, { currency: "USD" });
    expect(edited.status).toBe(200);
    expect(await edited.json()).toMatchObject({ data: { id: data.id, currency: "USD" } });

    const archived = await call(role, "POST", `/${data.id}/archive`);
    expect(archived.status).toBe(200);
    expect(await archived.json()).toMatchObject({ data: { id: data.id }, error: null });
  });

  it("answers 409 for the last open Country and 400 for a code outside the list", async () => {
    const countries = await (await call("owner", "GET", "")).json();
    const us = countries.data[0];
    await call("owner", "POST", `/${spareCountryId}/archive`);

    const last = await call("owner", "POST", `/${us.id}/archive`);
    const bad = await call("owner", "POST", "", { country: "ZZ", currency: "USD" });

    expect(last.status).toBe(409);
    expect(bad.status).toBe(400);
  });
});
