import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { beforeAll, describe, expect, it } from "vitest";
import { accessMasterPowers, accessMasterRoles, accessRolePowers, tenantMenuCategories } from "@repo/db-amelie";
import { AppError } from "#/lib/errors";
import type { DbConnectType } from "#/lib/db-connection";
import type { AppEnv } from "#/types/variables";
import menuRestAPI from "#/modules/menu";
import { requireTenantMember } from "#/modules/tenant";
import {
  createTestPglite,
  defaultLocationId,
  insertMember,
  insertMenuItems,
  insertPersonWithLogin,
  insertTenant,
} from "#/__tests__/amelie-test-db";

let db: DbConnectType;
let tenantId: string;
let itemId: string;
let locationId: string;
let connectionString: string;
const users = { tenant_admin: "", store_admin: "", store_staff: "" };

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

const put = (as: keyof typeof users, path: "locations" | "sold-out-locations") =>
  app.fetch(
    new Request(`http://localhost/menu/items/${itemId}/${path}?tenantId=${tenantId}`, {
      method: "PUT",
      headers: { "X-Test-User": users[as], "Content-Type": "application/json" },
      body: JSON.stringify({ availableAtAllLocations: true, locationIds: [locationId] }),
    }),
    // SAFETY: only the connection string is read from the bindings.
    { HYPERDRIVE_REALTIME: { connectionString } } as never,
  );

const grant = async (roleKey: string, power: string) => {
  const [master] = await db.select().from(accessMasterRoles).where(eq(accessMasterRoles.key, roleKey));
  const [row] = await db.select().from(accessMasterPowers).where(eq(accessMasterPowers.power, power));
  await db.insert(accessRolePowers).values({ masterRoleId: master.id, masterPowerId: row.id, scope: "tenant" });
  return async () => {
    await db
      .delete(accessRolePowers)
      .where(and(eq(accessRolePowers.masterRoleId, master.id), eq(accessRolePowers.masterPowerId, row.id)));
  };
};

beforeAll(async () => {
  const created = await createTestPglite();
  db = created.db;
  const server = new PGLiteSocketServer({ db: created.pg, port: 0, maxConnections: 50 });
  await server.start();
  connectionString = `postgresql://postgres@${server.getServerConn()}/postgres`;
  tenantId = await insertTenant(db, "Sorella", "sorella");
  locationId = await defaultLocationId(db, tenantId);
  const [category] = await db.insert(tenantMenuCategories).values({ tenantId, name: "Menu" }).returning();
  [{ id: itemId }] = await insertMenuItems(db, tenantId, [{ categoryId: category.id, name: "Iced Latte", price: "5" }]);
  for (const role of ["tenant_admin", "store_admin", "store_staff"] as const) {
    const login = await insertPersonWithLogin(db, `${role}@example.com`);
    await insertMember(db, tenantId, login.partyId, role);
    users[role] = login.userId;
  }
});

describe("choosing where an item is sold (Master menu) and marking it sold out (store)", () => {
  it.each(["tenant_admin", "store_admin"] as const)("lets a %s do both", async (role) => {
    expect((await put(role, "locations")).status).toBe(200);
    expect((await put(role, "sold-out-locations")).status).toBe(200);
  });

  it("keeps a store_staff member out of both", async () => {
    expect((await put("store_staff", "locations")).status).toBe(403);
    expect((await put("store_staff", "sold-out-locations")).status).toBe(403);
  });

  it("lets the store Power mark sold out without letting the role choose where an item is sold", async () => {
    const undo = await grant("store_staff", "store:menu:availability:update");
    const soldOut = await put("store_staff", "sold-out-locations");
    const choose = await put("store_staff", "locations");
    await undo();

    expect(soldOut.status).toBe(200);
    expect(choose.status).toBe(403);
  });

  it("lets the Master menu Power choose where an item is sold without letting the role mark sold out", async () => {
    const undo = await grant("store_staff", "company:menu:locations:update");
    const choose = await put("store_staff", "locations");
    const soldOut = await put("store_staff", "sold-out-locations");
    await undo();

    expect(choose.status).toBe(200);
    expect(soldOut.status).toBe(403);
  });
});
