import { beforeAll, describe, expect, it } from "vitest";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import {
  partyRoles,
  partyRoleScopes,
  tenantBusinessHours as businessHours,
  tenantBusinessHoursOverrides as hoursOverrides,
  tenantLocations,
} from "@repo/db-amelie";
import { AppError } from "#/lib/errors";
import type { AppEnv } from "#/types/variables";
import scheduleRestAPI from "#/modules/schedule";
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
let harbourId: string;
let admin: { userId: string; partyId: string };
let staff: { userId: string; partyId: string };
let manager: { userId: string; partyId: string };

const app = new Hono<AppEnv>();
app.onError((err, c) => {
  if (err instanceof AppError) {
    // SAFETY: AppError subclasses only use 4xx/5xx codes.
    return c.json({ data: null, error: { code: err.code, message: err.message } }, err.statusCode as 403);
  }
  throw err;
});
app.use("/schedule/*", async (c, next) => {
  c.set("userId", c.req.header("X-Test-User") ?? "");
  await next();
});
app.use("/schedule/*", requireTenantMember);
app.route("/schedule", scheduleRestAPI);

// SAFETY: only the connection string is read from the bindings.
const env = () => ({ HYPERDRIVE_REALTIME: { connectionString } }) as never;

const call = (
  userId: string,
  method: string,
  path: string,
  locationId?: string,
  body?: SetWeeklyHoursBody | SetHoursOverrideBody,
) => {
  const query = new URLSearchParams({ tenantId });
  if (locationId) query.set("locationId", locationId);
  return app.fetch(
    new Request(`http://localhost/schedule${path}?${query}`, {
      method,
      headers: { "X-Test-User": userId, "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    }),
    env(),
  );
};

const HOURS = { isClosed: false, opensAt: "08:00", closesAt: "16:00" };
const OVERRIDE = { ...HOURS, note: "Holiday" };
const DATE = "2099-12-25";

const bind = async (partyId: string, locationId: string) => {
  const [role] = await db.select({ id: partyRoles.id }).from(partyRoles).where(eq(partyRoles.partyId, partyId));
  await db.insert(partyRoleScopes).values({ tenantId, partyRoleId: role.id, locationId });
};
const unbind = async (partyId: string) => {
  const [role] = await db.select({ id: partyRoles.id }).from(partyRoles).where(eq(partyRoles.partyId, partyId));
  await db.delete(partyRoleScopes).where(eq(partyRoleScopes.partyRoleId, role.id));
};
const hoursRows = async (locationId: string) =>
  db.select().from(businessHours).where(eq(businessHours.locationId, locationId));
const overrideRows = async (locationId: string) =>
  db.select().from(hoursOverrides).where(eq(hoursOverrides.locationId, locationId));

beforeAll(async () => {
  const created = await createTestPglite();
  db = created.db;
  const server = new PGLiteSocketServer({ db: created.pg, port: 0, maxConnections: 500 });
  await server.start();
  connectionString = `postgresql://postgres@${server.getServerConn()}/postgres`;
  tenantId = await insertTenant(db, "Sorella", "sorella");
  downtownId = await defaultLocationId(db, tenantId);
  airportId = await insertLocation(db, tenantId, { name: "Airport", slug: "airport" });
  harbourId = await insertLocation(db, tenantId, { name: "Harbour", slug: "harbour" });
  admin = await insertPersonWithLogin(db, "admin@example.com");
  await insertMember(db, tenantId, admin.partyId, "tenant_admin");
  staff = await insertPersonWithLogin(db, "staff@example.com");
  await insertMember(db, tenantId, staff.partyId, "store_admin");
  manager = await insertPersonWithLogin(db, "manager@example.com");
  await insertMember(db, tenantId, manager.partyId, "store_admin");
});

describe("a member bound to Airport", () => {
  beforeAll(() => bind(staff.partyId, airportId));

  it("edits and reads Airport hours", async () => {
    expect((await call(staff.userId, "PUT", "/hours/1", airportId, HOURS)).status).toBe(200);
    expect((await call(staff.userId, "PUT", `/overrides/${DATE}`, airportId, OVERRIDE)).status).toBe(200);
    expect((await call(staff.userId, "GET", "", airportId)).status).toBe(200);
    expect((await call(staff.userId, "DELETE", `/overrides/${DATE}`, airportId)).status).toBe(200);
  });

  it("is refused for Downtown on every hours route, and nothing is written", async () => {
    const responses = [
      await call(staff.userId, "GET", "", downtownId),
      await call(staff.userId, "PUT", "/hours/2", downtownId, HOURS),
      await call(staff.userId, "PUT", `/overrides/${DATE}`, downtownId, OVERRIDE),
      await call(staff.userId, "DELETE", `/overrides/${DATE}`, downtownId),
    ];
    expect(responses.map((res) => res.status)).toEqual([403, 403, 403, 403]);
    expect((await responses[1].json()).error.message).toBe("Your Role does not cover this Location");
    expect(await hoursRows(downtownId)).toEqual([]);
    expect(await overrideRows(downtownId)).toEqual([]);
  });

  it("can omit the Location when Airport is the only one covered", async () => {
    expect((await call(staff.userId, "PUT", "/hours/3", undefined, HOURS)).status).toBe(200);
    expect((await hoursRows(airportId)).map((row) => row.dayOfWeek).toSorted()).toEqual([1, 3]);
    expect(await hoursRows(downtownId)).toEqual([]);
  });
});

describe("a member bound to two Locations", () => {
  beforeAll(async () => {
    await bind(manager.partyId, airportId);
    await bind(manager.partyId, harbourId);
  });

  it("gets needs-location listing only the covered ones when omitting it", async () => {
    const res = await call(manager.userId, "GET", "");
    expect(res.status).toBe(400);
    const message: string = (await res.json()).error.message;
    expect(message).toContain("Airport");
    expect(message).toContain("Harbour");
    expect(message).not.toContain("Downtown");
  });

  it("works at a covered Location", async () => {
    expect((await call(manager.userId, "GET", "", harbourId)).status).toBe(200);
  });
});

describe("a bound member whose bindings are all archived", () => {
  it("covers nothing, even with the Location omitted", async () => {
    const lonely = await insertPersonWithLogin(db, "lonely@example.com");
    await insertMember(db, tenantId, lonely.partyId, "store_admin");
    const [role] = await db.select({ id: partyRoles.id }).from(partyRoles).where(eq(partyRoles.partyId, lonely.partyId));
    const gone = await insertLocation(db, tenantId, { name: "Gone", slug: "gone" });
    await db.insert(partyRoleScopes).values({ tenantId, partyRoleId: role.id, locationId: gone });
    await db.update(tenantLocations).set({ archivedAt: new Date() }).where(eq(tenantLocations.id, gone));

    expect((await call(lonely.userId, "GET", "")).status).toBe(403);
    expect((await call(lonely.userId, "GET", "", downtownId)).status).toBe(403);
  });
});

describe("unbound members and the tenant admin", () => {
  it("behave as before: any Location, or the default when it is omitted", async () => {
    await unbind(staff.partyId);
    expect((await call(staff.userId, "PUT", "/hours/4", downtownId, HOURS)).status).toBe(200);
    expect((await call(admin.userId, "PUT", "/hours/4", harbourId, HOURS)).status).toBe(200);
    const res = await call(admin.userId, "GET", "");
    expect(res.status).toBe(400);
    expect((await res.json()).error.message).not.toContain("Role covers");
  });
});
