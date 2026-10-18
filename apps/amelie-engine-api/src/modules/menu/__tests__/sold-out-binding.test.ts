import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { beforeAll, describe, expect, it } from "vitest";
import { partyRoles, partyRoleScopes, tenantMenuCategories } from "@repo/db-amelie";
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
let tenantId: string;
let itemId: string;
let downtownId: string;
let airportId: string;
let harbourId: string;
let connectionString: string;
let bound: { userId: string; partyId: string };

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

const putSoldOut = (locationIds: string[]) =>
  app.fetch(
    new Request(`http://localhost/menu/items/${itemId}/sold-out-locations?tenantId=${tenantId}`, {
      method: "PUT",
      headers: { "X-Test-User": bound.userId, "Content-Type": "application/json" },
      body: JSON.stringify({ availableAtAllLocations: false, locationIds }),
    }),
    // SAFETY: only the connection string is read from the bindings.
    { HYPERDRIVE_REALTIME: { connectionString } } as never,
  );

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
  bound = await insertPersonWithLogin(db, "bound@example.com");
  await insertMember(db, tenantId, bound.partyId, "store_admin");
  const [role] = await db.select({ id: partyRoles.id }).from(partyRoles).where(eq(partyRoles.partyId, bound.partyId));
  await db.insert(partyRoleScopes).values({ tenantId, partyRoleId: role.id, locationId: airportId });
});

describe("setting sold-out Locations as a member bound to Airport", () => {
  it("is refused whole when any named Location is uncovered, naming the uncovered ones", async () => {
    const res = await putSoldOut([airportId, downtownId, harbourId]);

    expect(res.status).toBe(403);
    const message: string = (await res.json()).error.message;
    expect(message).toContain(downtownId);
    expect(message).toContain(harbourId);
    expect(message).not.toContain(airportId);
  });

  it("is allowed when every named Location is covered", async () => {
    expect((await putSoldOut([airportId])).status).toBe(200);
  });
});
