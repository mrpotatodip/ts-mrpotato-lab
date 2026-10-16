import { beforeAll, describe, expect, it } from "vitest";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
import { Hono } from "hono";
import { AppError } from "#/lib/errors";
import type { AppEnv } from "#/types/variables";
import locationRestAPI from "#/modules/location";
import { requireTenantMember } from "#/modules/tenant";
import {
  createTestPglite,
  defaultLocationId,
  insertLocation,
  insertMember,
  insertPersonWithLogin,
  insertTenant,
} from "#/__tests__/amelie-test-db";

// -----
// The routes open their own connection with
// db_connect, so the test database is served over
// a real socket and the connection string points
// at it. The session is faked by a header; the
// Tenant and Role checks are the real middleware.
// The server is never stopped: the routes leave
// their pools open, and closing it under them
// raises connection errors.
// -----
type TestUsers = { tenant_admin: string; store_admin: string; store_staff: string };

let tenantId: string;
let locationId: string;
let connectionString: string;
const users: TestUsers = { tenant_admin: "", store_admin: "", store_staff: "" };

const app = new Hono<AppEnv>();
app.onError((err, c) => {
  if (err instanceof AppError) {
    // SAFETY: AppError subclasses only use 4xx/5xx codes.
    return c.json({ data: null, error: { code: err.code, message: err.message } }, err.statusCode as 403);
  }
  throw err;
});
app.use("/locations/*", async (c, next) => {
  c.set("userId", c.req.header("X-Test-User") ?? "");
  await next();
});
app.use("/locations/*", requireTenantMember);
app.use("/locations", async (c, next) => {
  c.set("userId", c.req.header("X-Test-User") ?? "");
  await next();
});
app.use("/locations", requireTenantMember);
app.route("/locations", locationRestAPI);

type RouteBody = Record<string, string>;

const call = (as: keyof TestUsers, method: string, path: string, body?: RouteBody) =>
  app.fetch(
    new Request(`http://localhost/locations${path}?tenantId=${tenantId}`, {
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
  locationId = await defaultLocationId(db, tenantId);
  await insertLocation(db, tenantId, { name: "Airport", slug: "airport" });
  for (const role of ["tenant_admin", "store_admin", "store_staff"] as const) {
    const login = await insertPersonWithLogin(db, `${role}@test`);
    await insertMember(db, tenantId, login.partyId, role);
    users[role] = login.userId;
  }
});

describe("Location routes by Role", () => {
  it("lets staff read the Locations", async () => {
    const res = await call("store_staff", "GET", "");

    expect(res.status).toBe(200);
  });

  it.each([
    ["adding a Location", "POST", "", { name: "Harbor" }],
    ["editing a Location", "PATCH", "/LOCATION", { name: "Renamed" }],
    ["archiving a Location", "POST", "/LOCATION/archive", undefined],
  ])("keeps staff (can_edit false) out of %s with a 403", async (_label, method, path, body) => {
    const res = await call("store_staff", method, path.replace("LOCATION", locationId), body);

    expect(res.status).toBe(403);
  });

  it.each(["tenant_admin", "store_admin"] as const)("lets a %s add, edit and archive a Location", async (role) => {
    const added = await call(role, "POST", "", { name: `Added by ${role}` });
    expect(added.status).toBe(201);
    const { data } = await added.json();

    const edited = await call(role, "PATCH", `/${data.id}`, { name: `Edited by ${role}` });
    expect(edited.status).toBe(200);

    const archived = await call(role, "POST", `/${data.id}/archive`);
    expect(archived.status).toBe(200);
    expect(await archived.json()).toMatchObject({ data: { id: data.id, unsoldMenuItems: [] }, error: null });
  });
});
