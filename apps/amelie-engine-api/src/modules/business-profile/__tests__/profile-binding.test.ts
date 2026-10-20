import { beforeAll, describe, expect, it } from "vitest";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { partyRoles, partyRoleScopes, tenantLocations } from "@repo/db-amelie";
import { AppError } from "#/lib/errors";
import type { AppEnv } from "#/types/variables";
import businessProfileRestAPI from "#/modules/business-profile";
import { requireTenantMember } from "#/modules/tenant";
import {
  createTestPglite,
  defaultLocationId,
  insertLocation,
  insertMember,
  insertPersonWithLogin,
  insertTenant,
} from "#/__tests__/amelie-test-db";
import type { DbConnectType } from "#/lib/db-connection";

let db: DbConnectType;
let connectionString: string;
let tenantId: string;
let downtownId: string;
let airportId: string;
let admin: { userId: string; partyId: string };
let bound: { userId: string; partyId: string };
let free: { userId: string; partyId: string };

const app = new Hono<AppEnv>();
app.onError((err, c) => {
  if (err instanceof AppError) {
    // SAFETY: AppError subclasses only use 4xx/5xx codes.
    return c.json({ data: null, error: { code: err.code, message: err.message } }, err.statusCode as 403);
  }
  throw err;
});
app.use("/business-profile", async (c, next) => {
  c.set("userId", c.req.header("X-Test-User") ?? "");
  await next();
});
app.use("/business-profile", requireTenantMember);
app.route("/business-profile", businessProfileRestAPI);

// SAFETY: only the connection string is read from the bindings.
const env = () => ({ HYPERDRIVE_REALTIME: { connectionString } }) as never;

const EMPTY = { description: null, websiteUrl: null, phone: null, email: null, address: null };

const update = (userId: string, body: Partial<typeof EMPTY>, locationId?: string) => {
  const query = new URLSearchParams({ tenantId });
  if (locationId) query.set("locationId", locationId);
  return app.fetch(
    new Request(`http://localhost/business-profile?${query}`, {
      method: "PUT",
      headers: { "X-Test-User": userId, "Content-Type": "application/json" },
      body: JSON.stringify({ ...EMPTY, ...body }),
    }),
    env(),
  );
};

const locationRow = async (id: string) => (await db.select().from(tenantLocations).where(eq(tenantLocations.id, id)))[0];

beforeAll(async () => {
  const created = await createTestPglite();
  db = created.db;
  const server = new PGLiteSocketServer({ db: created.pg, port: 0, maxConnections: 500 });
  await server.start();
  connectionString = `postgresql://postgres@${server.getServerConn()}/postgres`;
  tenantId = await insertTenant(db, "Sorella", "sorella");
  downtownId = await defaultLocationId(db, tenantId);
  airportId = await insertLocation(db, tenantId, { name: "Airport", slug: "airport" });
  admin = await insertPersonWithLogin(db, "admin@example.com");
  await insertMember(db, tenantId, admin.partyId, "tenant_admin");
  bound = await insertPersonWithLogin(db, "bound@example.com");
  await insertMember(db, tenantId, bound.partyId, "store_admin");
  free = await insertPersonWithLogin(db, "free@example.com");
  await insertMember(db, tenantId, free.partyId, "store_admin");
  const [role] = await db.select({ id: partyRoles.id }).from(partyRoles).where(eq(partyRoles.partyId, bound.partyId));
  await db.insert(partyRoleScopes).values({ tenantId, partyRoleId: role.id, locationId: airportId });
});

describe("a member bound to Airport", () => {
  it("changes the phone and address of Airport", async () => {
    const res = await update(bound.userId, { phone: "555-0100", address: "1 Runway Rd" }, airportId);
    expect(res.status).toBe(200);
    expect(await locationRow(airportId)).toMatchObject({ phone: "555-0100", address: "1 Runway Rd" });
  });

  it("is refused a phone or address change naming Downtown, and nothing is written", async () => {
    const res = await update(bound.userId, { phone: "555-0199" }, downtownId);
    expect(res.status).toBe(403);
    expect((await res.json()).error.message).toBe(`Your Role does not cover these Locations: ${downtownId}`);
    expect((await locationRow(downtownId)).phone).toBeNull();
  });

  it("changes the cafe-wide fields without naming a Location", async () => {
    const res = await update(bound.userId, { description: "Good coffee", websiteUrl: "https://sorella.test" });
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ data: { description: "Good coffee" } });
  });

  it("changes a phone with the Location left out when Airport is the only one covered", async () => {
    expect((await update(bound.userId, { phone: "555-0111" })).status).toBe(200);
    expect((await locationRow(airportId)).phone).toBe("555-0111");
    expect((await locationRow(downtownId)).phone).toBeNull();
  });
});

describe("unbound members and the tenant admin", () => {
  it("change any Location's phone and the cafe-wide fields", async () => {
    expect((await update(free.userId, { phone: "555-0200" }, downtownId)).status).toBe(200);
    expect((await update(admin.userId, { phone: "555-0300" }, airportId)).status).toBe(200);
    expect((await update(admin.userId, { description: "Hello" }, downtownId)).status).toBe(200);
  });
});
