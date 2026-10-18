import { beforeAll, describe, expect, it } from "vitest";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { partyRoles, partyRoleScopes, tenantCountries, tenantLocations } from "@repo/db-amelie";
import { AppError } from "#/lib/errors";
import type { AppEnv } from "#/types/variables";
import locationRestAPI from "#/modules/location";
import { requireTenantMember } from "#/modules/tenant";
import {
  createTestPglite,
  defaultLocationId,
  insertCountry,
  insertLocation,
  insertMember,
  insertPersonWithLogin,
  insertTenant,
} from "#/__tests__/amelie-test-db";
import type { DbConnectType } from "#/lib/db-connection";

let db: DbConnectType;
let connectionString: string;
let tenantId: string;
let usId: string;
let caId: string;
let downtownId: string;
let airportId: string;
let torontoId: string;
let admin: { userId: string; partyId: string };
let staff: { userId: string; partyId: string };

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

const call = (userId: string, method: string, path: string, body?: Record<string, string>) =>
  app.fetch(
    new Request(`http://localhost/locations${path}?tenantId=${tenantId}`, {
      method,
      headers: { "X-Test-User": userId, "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    }),
    // SAFETY: these routes read only HYPERDRIVE_REALTIME from the bindings.
    { HYPERDRIVE_REALTIME: { connectionString } } as never,
  );

const roleId = async (partyId: string) => {
  const [role] = await db.select({ id: partyRoles.id }).from(partyRoles).where(eq(partyRoles.partyId, partyId));
  return role.id;
};
const bind = async (partyId: string, scope: { countryId: string } | { locationId: string }) =>
  db.insert(partyRoleScopes).values({ tenantId, partyRoleId: await roleId(partyId), ...scope });
const unbind = async (partyId: string) =>
  db.delete(partyRoleScopes).where(eq(partyRoleScopes.partyRoleId, await roleId(partyId)));
const locationNamed = async (name: string) =>
  (await db.select().from(tenantLocations).where(eq(tenantLocations.tenantId, tenantId))).find(
    (row) => row.name === name,
  );

beforeAll(async () => {
  const created = await createTestPglite();
  db = created.db;
  const server = new PGLiteSocketServer({ db: created.pg, port: 0, maxConnections: 100 });
  await server.start();
  connectionString = `postgresql://postgres@${server.getServerConn()}/postgres`;
  tenantId = await insertTenant(db, "Sorella", "sorella");
  downtownId = await defaultLocationId(db, tenantId);
  const [downtown] = await db.select().from(tenantLocations).where(eq(tenantLocations.id, downtownId));
  usId = downtown.countryId;
  airportId = await insertLocation(db, tenantId, { name: "Airport", slug: "airport" });
  caId = await insertCountry(db, tenantId, { country: "CA", currency: "CAD" });
  torontoId = await insertLocation(db, tenantId, { name: "Toronto", slug: "toronto", countryId: caId });
  admin = await insertPersonWithLogin(db, "admin@example.com");
  await insertMember(db, tenantId, admin.partyId, "tenant_admin");
  staff = await insertPersonWithLogin(db, "staff@example.com");
  await insertMember(db, tenantId, staff.partyId, "store_admin");
});

describe("a member bound to Airport only", () => {
  beforeAll(() => bind(staff.partyId, { locationId: airportId }));

  it("updates and previews the archive of the covered Location", async () => {
    expect((await call(staff.userId, "PATCH", `/${airportId}`, { name: "Airport 2" })).status).toBe(200);
    expect((await call(staff.userId, "GET", `/${airportId}/archive-preview`)).status).toBe(200);
  });

  it("is refused update, archive-preview and archive of an uncovered Location, and nothing changes", async () => {
    const responses = [
      await call(staff.userId, "PATCH", `/${downtownId}`, { name: "Hacked" }),
      await call(staff.userId, "GET", `/${downtownId}/archive-preview`),
      await call(staff.userId, "POST", `/${downtownId}/archive`),
    ];
    expect(responses.map((res) => res.status)).toEqual([403, 403, 403]);
    expect((await responses[0].json()).error.message).toBe("Your Role does not cover this Location");
    const row = await locationNamed("Sorella");
    expect(row?.archivedAt).toBeNull();
  });

  it("still lists every Location", async () => {
    expect((await call(staff.userId, "GET", "")).status).toBe(200);
  });

  it("cannot create a Location", async () => {
    const res = await call(staff.userId, "POST", "", { name: "Nope", countryId: usId });
    expect(res.status).toBe(403);
    expect(await locationNamed("Nope")).toBeUndefined();
  });
});

describe("a member bound to the Canada Country", () => {
  beforeAll(async () => {
    await unbind(staff.partyId);
    await bind(staff.partyId, { countryId: caId });
  });

  it("creates a Location in Canada", async () => {
    const res = await call(staff.userId, "POST", "", { name: "Montreal", countryId: caId });
    expect(res.status).toBe(201);
  });

  it("defaults to the bound Country when none is named", async () => {
    const res = await call(staff.userId, "POST", "", { name: "Ottawa" });
    expect(res.status).toBe(201);
    expect((await locationNamed("Ottawa"))?.countryId).toBe(caId);
  });

  it("cannot create a Location in another Country", async () => {
    const res = await call(staff.userId, "POST", "", { name: "Boston", countryId: usId });
    expect(res.status).toBe(403);
    expect(await locationNamed("Boston")).toBeUndefined();
  });

  it("updates a Location in Canada and not one in the US", async () => {
    expect((await call(staff.userId, "PATCH", `/${torontoId}`, { name: "Toronto 2" })).status).toBe(200);
    expect((await call(staff.userId, "PATCH", `/${airportId}`, { name: "Nope" })).status).toBe(403);
  });
});

describe("a member whose only Country binding is archived", () => {
  it("cannot create a Location", async () => {
    await unbind(staff.partyId);
    const gone = await insertCountry(db, tenantId, { country: "MX", currency: "MXN" });
    await bind(staff.partyId, { countryId: gone });
    await db.update(tenantCountries).set({ archivedAt: new Date() }).where(eq(tenantCountries.id, gone));
    expect((await call(staff.userId, "POST", "", { name: "Cancun", countryId: gone })).status).toBe(403);
    expect((await call(staff.userId, "POST", "", { name: "Cancun", countryId: usId })).status).toBe(403);
  });
});

describe("a member with a Country binding and a Location binding elsewhere", () => {
  it("creates only in the bound Country", async () => {
    await unbind(staff.partyId);
    await bind(staff.partyId, { countryId: caId });
    await bind(staff.partyId, { locationId: airportId });
    expect((await call(staff.userId, "POST", "", { name: "Calgary", countryId: caId })).status).toBe(201);
    expect((await call(staff.userId, "POST", "", { name: "Denver", countryId: usId })).status).toBe(403);
  });
});

describe("unbound members and the tenant admin", () => {
  it("manage Locations anywhere, as before", async () => {
    await unbind(staff.partyId);
    expect((await call(staff.userId, "POST", "", { name: "Staff US", countryId: usId })).status).toBe(201);
    expect((await call(admin.userId, "POST", "", { name: "Admin CA", countryId: caId })).status).toBe(201);
    expect((await call(staff.userId, "PATCH", `/${downtownId}`, { name: "Downtown 2" })).status).toBe(200);
    expect((await call(admin.userId, "POST", `/${airportId}/archive`)).status).toBe(200);
  });
});
