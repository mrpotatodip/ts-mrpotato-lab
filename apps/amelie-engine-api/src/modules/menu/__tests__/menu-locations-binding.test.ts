import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  partyRoles,
  partyRoleScopes,
  tenantLocations,
  tenantMenuCategories,
  tenantMenuItemLocations,
  tenantMenuItems,
} from "@repo/db-amelie";
import { AppError } from "#/lib/errors";
import type { DbConnectType } from "#/lib/db-connection";
import type { AppEnv } from "#/types/variables";
import menuRestAPI from "#/modules/menu";
import { requireTenantMember } from "#/modules/tenant";
import {
  createTestPglite,
  defaultLocationId,
  insertLocation,
  insertMember,
  insertMenuItems,
  insertPersonWithLogin,
  insertTenant,
} from "#/__tests__/amelie-test-db";

let db: DbConnectType;
let connectionString: string;
let tenantId: string;
let itemId: string;
let downtownId: string;
let airportId: string;
let harbourId: string;
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
app.use("/menu/*", async (c, next) => {
  c.set("userId", c.req.header("X-Test-User") ?? "");
  await next();
});
app.use("/menu/*", requireTenantMember);
app.route("/menu", menuRestAPI);

type Body = { availableAtAllLocations: boolean; locationIds: string[] };
const put = (userId: string, path: "locations" | "sold-out-locations", body: Body) =>
  app.fetch(
    new Request(`http://localhost/menu/items/${itemId}/${path}?tenantId=${tenantId}`, {
      method: "PUT",
      headers: { "X-Test-User": userId, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
    // SAFETY: only the connection string is read from the bindings.
    { HYPERDRIVE_REALTIME: { connectionString } } as never,
  );

const soldOutAt = (...locationIds: string[]): Body => ({ availableAtAllLocations: true, locationIds });
const onlyAt = (...locationIds: string[]): Body => ({ availableAtAllLocations: false, locationIds });

const roleOf = async (partyId: string) => {
  const [role] = await db.select({ id: partyRoles.id }).from(partyRoles).where(eq(partyRoles.partyId, partyId));
  return role.id;
};
const bind = async (partyId: string, locationId: string) =>
  db.insert(partyRoleScopes).values({ tenantId, partyRoleId: await roleOf(partyId), locationId });
const unbind = async (partyId: string) =>
  db.delete(partyRoleScopes).where(eq(partyRoleScopes.partyRoleId, await roleOf(partyId)));

const stored = async () => {
  const [item] = await db.select().from(tenantMenuItems).where(eq(tenantMenuItems.id, itemId));
  const rows = await db.select().from(tenantMenuItemLocations).where(eq(tenantMenuItemLocations.menuItemId, itemId));
  return { all: item.availableAtAllLocations, rows: rows.map((r) => r.locationId).toSorted() };
};
const rowsOf = (...ids: string[]) => ids.toSorted();
const untouched = { all: true, rows: [] };

beforeAll(async () => {
  const created = await createTestPglite();
  db = created.db;
  const server = new PGLiteSocketServer({ db: created.pg, port: 0, maxConnections: 50 });
  await server.start();
  connectionString = `postgresql://postgres@${server.getServerConn()}/postgres`;
  tenantId = await insertTenant(db, "Sorella", "sorella");
  downtownId = await defaultLocationId(db, tenantId);
  airportId = await insertLocation(db, tenantId, { name: "Airport", slug: "airport" });
  harbourId = await insertLocation(db, tenantId, { name: "Harbour", slug: "harbour" });
  const [category] = await db.insert(tenantMenuCategories).values({ tenantId, name: "Menu" }).returning();
  [{ id: itemId }] = await insertMenuItems(db, tenantId, [{ categoryId: category.id, name: "Iced Latte", price: "5" }]);
  admin = await insertPersonWithLogin(db, "admin@example.com");
  await insertMember(db, tenantId, admin.partyId, "tenant_admin");
  staff = await insertPersonWithLogin(db, "staff@example.com");
  await insertMember(db, tenantId, staff.partyId, "store_admin");
});

beforeEach(async () => {
  await db.delete(tenantMenuItemLocations).where(eq(tenantMenuItemLocations.menuItemId, itemId));
  await db.update(tenantMenuItems).set({ availableAtAllLocations: true }).where(eq(tenantMenuItems.id, itemId));
});

describe("a member bound to Airport and Harbour", () => {
  beforeAll(async () => {
    await bind(staff.partyId, airportId);
    await bind(staff.partyId, harbourId);
  });

  describe("marking an item sold out", () => {
    it("works for covered Locations", async () => {
      expect((await put(staff.userId, "sold-out-locations", soldOutAt(airportId, harbourId))).status).toBe(200);
      expect(await stored()).toEqual({ all: true, rows: [airportId, harbourId].toSorted() });
    });

    it("refuses one uncovered Location and names it", async () => {
      const res = await put(staff.userId, "sold-out-locations", soldOutAt(downtownId));
      expect(res.status).toBe(403);
      expect((await res.json()).error.message).toContain(downtownId);
      expect(await stored()).toEqual(untouched);
    });

    it("refuses a covered plus an uncovered Location whole, naming only the uncovered one", async () => {
      const res = await put(staff.userId, "sold-out-locations", soldOutAt(airportId, downtownId));
      expect(res.status).toBe(403);
      const message: string = (await res.json()).error.message;
      expect(message).toContain(downtownId);
      expect(message).not.toContain(airportId);
      expect(await stored()).toEqual(untouched);
    });
  });

  describe("choosing where an item is sold", () => {
    it("works for covered Locations", async () => {
      expect((await put(staff.userId, "locations", onlyAt(airportId, harbourId))).status).toBe(200);
      expect(await stored()).toEqual({ all: false, rows: [downtownId, airportId, harbourId].toSorted() });
    });

    it("refuses an uncovered Location and names it", async () => {
      const res = await put(staff.userId, "locations", onlyAt(downtownId));
      expect(res.status).toBe(403);
      expect((await res.json()).error.message).toContain(downtownId);
      expect(await stored()).toEqual(untouched);
    });

    it("refuses a mix whole, naming only the uncovered one, with nothing written", async () => {
      const res = await put(staff.userId, "locations", onlyAt(airportId, downtownId));
      expect(res.status).toBe(403);
      const message: string = (await res.json()).error.message;
      expect(message).toContain(downtownId);
      expect(message).not.toContain(airportId);
      expect(await stored()).toEqual(untouched);
    });

    it("refuses 'sold at every Location' even when the listed ones are covered, since it names every Location", async () => {
      const res = await put(staff.userId, "locations", soldOutAt(airportId));
      expect(res.status).toBe(403);
      expect(await stored()).toEqual(untouched);
    });
  });
});

describe("a bound member's write keeps the state at Locations they do not cover", () => {
  const seed = async (all: boolean, locationIds: string[]) => {
    await db.update(tenantMenuItems).set({ availableAtAllLocations: all }).where(eq(tenantMenuItems.id, itemId));
    if (locationIds.length > 0) {
      await db
        .insert(tenantMenuItemLocations)
        .values(locationIds.map((locationId) => ({ tenantId, menuItemId: itemId, locationId, isAvailable: !all })));
    }
  };

  beforeAll(async () => {
    await unbind(staff.partyId);
    await bind(staff.partyId, airportId);
    await bind(staff.partyId, harbourId);
  });

  it("sold out: replaces their own Locations and leaves a sold-out row at Downtown", async () => {
    await seed(true, [downtownId, airportId]);
    expect((await put(staff.userId, "sold-out-locations", soldOutAt(harbourId))).status).toBe(200);
    expect(await stored()).toEqual({ all: true, rows: rowsOf(downtownId, harbourId) });
  });

  it("sold out: naming none clears only their own Locations", async () => {
    await seed(true, [downtownId, airportId]);
    expect((await put(staff.userId, "sold-out-locations", soldOutAt())).status).toBe(200);
    expect(await stored()).toEqual({ all: true, rows: [downtownId] });
  });

  it("sold out: an item sold at chosen Locations keeps Downtown unsold", async () => {
    await seed(false, [airportId]);
    expect((await put(staff.userId, "sold-out-locations", soldOutAt())).status).toBe(200);
    expect(await stored()).toEqual({ all: true, rows: [downtownId] });
  });

  it("chosen Locations: keeps the rows at Downtown", async () => {
    await seed(false, [downtownId, airportId]);
    expect((await put(staff.userId, "locations", onlyAt(harbourId))).status).toBe(200);
    expect(await stored()).toEqual({ all: false, rows: rowsOf(downtownId, harbourId) });
  });

  it("chosen Locations: an item sold everywhere keeps selling at Downtown", async () => {
    await seed(true, []);
    expect((await put(staff.userId, "locations", onlyAt(airportId))).status).toBe(200);
    expect(await stored()).toEqual({ all: false, rows: rowsOf(downtownId, airportId) });
  });

  it("chosen Locations: Downtown stays unsold when it was sold out", async () => {
    await seed(true, [downtownId]);
    expect((await put(staff.userId, "locations", onlyAt(airportId))).status).toBe(200);
    expect(await stored()).toEqual({ all: false, rows: [airportId] });
  });

  it("unbound members and the tenant admin still replace the whole state", async () => {
    await seed(true, [downtownId, airportId]);
    expect((await put(admin.userId, "sold-out-locations", soldOutAt(harbourId))).status).toBe(200);
    expect(await stored()).toEqual({ all: true, rows: [harbourId] });
  });
});

describe("a bound member who covers nothing", () => {
  it("is refused on both routes", async () => {
    const lonely = await insertPersonWithLogin(db, "lonely@example.com");
    await insertMember(db, tenantId, lonely.partyId, "store_admin");
    const gone = await insertLocation(db, tenantId, { name: "Gone", slug: "gone" });
    await bind(lonely.partyId, gone);
    await db.update(tenantLocations).set({ archivedAt: new Date() }).where(eq(tenantLocations.id, gone));

    expect((await put(lonely.userId, "sold-out-locations", soldOutAt(airportId))).status).toBe(403);
    expect((await put(lonely.userId, "locations", onlyAt(airportId))).status).toBe(403);
    expect(await stored()).toEqual(untouched);
  });
});

describe("unbound members and the tenant admin", () => {
  it("behave as before on both routes, including 'sold at every Location'", async () => {
    await unbind(staff.partyId);
    expect((await put(staff.userId, "sold-out-locations", soldOutAt(downtownId, airportId))).status).toBe(200);
    expect((await put(staff.userId, "locations", soldOutAt(downtownId))).status).toBe(200);
    expect((await put(admin.userId, "locations", onlyAt(harbourId))).status).toBe(200);
    expect((await put(admin.userId, "sold-out-locations", soldOutAt(harbourId))).status).toBe(200);
  });
});
