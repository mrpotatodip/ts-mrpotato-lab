import { beforeAll, describe, expect, it } from "vitest";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import {
  accessAuditLog,
  accessMasterPowers,
  accessMasterRoles,
  accessRolePowers,
  addSuperuser,
  roles,
  syncAccessMasterPowers,
} from "@repo/db-amelie";
import {
  ACCESS_POWERS,
  type CreateAdminRoleBody,
  type SetAdminRoleEnabledBody,
  type SetAdminRolePowersBody,
  type UpdateAdminRoleBody,
} from "@repo/contracts/amelie";
import { AppError } from "#/lib/errors";
import type { AppEnv } from "#/types/variables";
import type { DbConnectType } from "#/lib/db-connection";
import { adminRoleStillBound } from "#/modules/admin-role/constants";
import { createRequireSuperuser } from "#/modules/admin";
import adminRoleRestAPI from "#/modules/admin-role";
import {
  createTestPglite,
  insertMember,
  insertPersonWithLogin,
  insertTenant,
} from "#/__tests__/amelie-test-db";

type AdminRequestBody =
  | CreateAdminRoleBody
  | UpdateAdminRoleBody
  | SetAdminRoleEnabledBody
  | SetAdminRolePowersBody;

let db: DbConnectType;
let connectionString: string;
let bossUserId: string;
let ownerUserId: string;
let sorellaId: string;

const app = new Hono<AppEnv>();
app.onError((err, c) => {
  if (err instanceof AppError) {
    // SAFETY: AppError subclasses only use 4xx/5xx codes.
    return c.json({ data: null, error: { code: err.code, message: err.message } }, err.statusCode as 404);
  }
  throw err;
});
app.use("/admin/*", async (c, next) => {
  c.set("userId", c.req.header("X-Test-User") ?? "");
  await next();
});
app.use("/admin/*", createRequireSuperuser(() => db));
app.route("/admin", adminRoleRestAPI);

const call = (as: string, method: string, path: string, body?: AdminRequestBody) =>
  app.fetch(
    new Request(`http://localhost/admin${path}`, {
      method,
      headers: { "X-Test-User": as, "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
    // SAFETY: only the connection string is read from the bindings.
    { HYPERDRIVE_REALTIME: { connectionString } } as never,
  );

// SAFETY: the routes answer with the envelope; each test reads only fields it asserts on.
const json = async (res: Response) => (await res.json()) as { data: any; error: { message: string } | null };

const roleByKey = async (key: string) => {
  const [row] = await db.select().from(accessMasterRoles).where(eq(accessMasterRoles.key, key));
  return row;
};

const createRole = async (key: string) => {
  const res = await call(bossUserId, "POST", "/roles", { key, label: key });
  expect(res.status).toBe(201);
  // SAFETY: the create route returns the new role, which always has an id.
  return (await json(res)).data as { id: string };
};

beforeAll(async () => {
  const created = await createTestPglite();
  db = created.db;
  const server = new PGLiteSocketServer({ db: created.pg, port: 0, maxConnections: 200 });
  await server.start();
  connectionString = `postgresql://postgres@${server.getServerConn()}/postgres`;
  sorellaId = await insertTenant(db, "Sorella", "sorella");
  const owner = await insertPersonWithLogin(db, "owner@sorella.test");
  await insertMember(db, sorellaId, owner.partyId, "tenant_admin");
  ownerUserId = owner.userId;
  const staff = await insertPersonWithLogin(db, "staff@sorella.test");
  await insertMember(db, sorellaId, staff.partyId, "store_staff");
  const boss = await insertPersonWithLogin(db, "boss@amelie.test");
  await addSuperuser(db, "boss@amelie.test");
  bossUserId = boss.userId;
});

describe("admin roles access", () => {
  it("answers not found to anyone who is not a superuser", async () => {
    expect((await call(ownerUserId, "GET", "/roles")).status).toBe(404);
    expect((await call(ownerUserId, "POST", "/roles", { key: "sneaky", label: "x" })).status).toBe(404);
  });

  it("lists every Master Role with its Power and holder counts", async () => {
    const res = await call(bossUserId, "GET", "/roles");

    expect(res.status).toBe(200);
    const { data } = await json(res);
    expect(data.map((role: { key: string }) => role.key).toSorted()).toEqual([
      "store_admin",
      "store_staff",
      "superuser",
      "tenant_admin",
    ]);
    expect(data.find((role: { key: string }) => role.key === "store_staff")).toMatchObject({
      scope: "tenant",
      enabled: true,
      isSystem: false,
      holderCount: 1,
    });
    expect(data.find((role: { key: string }) => role.key === "tenant_admin")).toMatchObject({ isSystem: true });
  });
});

describe("creating a role", () => {
  it("starts disabled with no Powers, and is audited", async () => {
    const res = await call(bossUserId, "POST", "/roles", {
      key: "shift_lead",
      label: "Shift lead",
      description: "Runs a shift",
    });

    expect(res.status).toBe(201);
    const { data } = await json(res);
    expect(data).toMatchObject({
      key: "shift_lead",
      label: "Shift lead",
      description: "Runs a shift",
      scope: "tenant",
      enabled: false,
      isSystem: false,
      powers: [],
    });
    const log = await json(await call(bossUserId, "GET", `/role-audit-log?roleId=${data.id}`));
    expect(log.data).toHaveLength(1);
    expect(log.data[0]).toMatchObject({ action: "role.created", actorEmail: "boss@amelie.test", before: null });
  });

  it("refuses a key that is taken", async () => {
    const res = await call(bossUserId, "POST", "/roles", { key: "store_staff", label: "Again" });

    expect(res.status).toBe(409);
  });

  it.each(["Shift Lead", "1lead", "a", "has-dash"])("refuses the key %j", async (key) => {
    const res = await call(bossUserId, "POST", "/roles", { key, label: "x" });

    expect(res.status).toBe(400);
  });

  it("edits the label but never the key", async () => {
    const { id } = await createRole("renamable");

    const res = await call(bossUserId, "PATCH", `/roles/${id}`, { label: "Renamed", key: "other" });

    expect((await json(res)).data).toMatchObject({ key: "renamable", label: "Renamed" });
  });
});

describe("enabling and disabling", () => {
  it("gives every existing cafe a Role row when enabled, and new cafes too", async () => {
    const { id } = await createRole("opener");
    expect(await db.select().from(roles).where(eq(roles.masterRoleId, id))).toHaveLength(0);

    const res = await call(bossUserId, "PUT", `/roles/${id}/enabled`, { enabled: true });

    expect(res.status).toBe(200);
    expect((await json(res)).data.enabled).toBe(true);
    expect(await db.select().from(roles).where(eq(roles.masterRoleId, id))).toHaveLength(1);
    await insertTenant(db, "Later Cafe", "later-cafe");
    expect(await db.select().from(roles).where(eq(roles.masterRoleId, id))).toHaveLength(2);
  });

  it("keeps a disabled role's Powers and holders", async () => {
    const { id } = await createRole("closer");
    await call(bossUserId, "PUT", `/roles/${id}/powers`, { powers: ["company:menu:items:read"] });
    await call(bossUserId, "PUT", `/roles/${id}/enabled`, { enabled: true });
    await call(bossUserId, "PUT", `/roles/${id}/enabled`, { enabled: false });

    const detail = await json(await call(bossUserId, "GET", `/roles/${id}`));

    expect(detail.data).toMatchObject({ enabled: false, powers: ["company:menu:items:read"] });
  });

  it("refuses to disable a system role", async () => {
    const master = await roleByKey("tenant_admin");

    const res = await call(bossUserId, "PUT", `/roles/${master.id}/enabled`, { enabled: false });

    expect(res.status).toBe(409);
  });

  it("refuses to enable or disable a platform role", async () => {
    const master = await roleByKey("superuser");

    const res = await call(bossUserId, "PUT", `/roles/${master.id}/enabled`, { enabled: true });

    expect(res.status).toBe(400);
  });

  it("writes no audit entry when nothing changes", async () => {
    const { id } = await createRole("steady");
    await call(bossUserId, "PUT", `/roles/${id}/enabled`, { enabled: false });

    const log = await json(await call(bossUserId, "GET", `/role-audit-log?roleId=${id}`));

    expect(log.data.map((entry: { action: string }) => entry.action)).toEqual(["role.created"]);
  });
});

describe("setting Powers", () => {
  it("replaces the set and records the old and new lists", async () => {
    const { id } = await createRole("greeter");
    await call(bossUserId, "PUT", `/roles/${id}/powers`, {
      powers: ["company:menu:items:read", "company:faqs:faqs:read"],
    });

    const res = await call(bossUserId, "PUT", `/roles/${id}/powers`, {
      powers: ["company:menu:items:read", "store:hours:weekly:read"],
    });

    expect((await json(res)).data.powers).toEqual(["company:menu:items:read", "store:hours:weekly:read"]);
    const log = await json(await call(bossUserId, "GET", `/role-audit-log?roleId=${id}&limit=1`));
    expect(log.data[0]).toMatchObject({
      action: "role.powers_set",
      before: { powers: ["company:faqs:faqs:read", "company:menu:items:read"] },
      after: { powers: ["company:menu:items:read", "store:hours:weekly:read"] },
    });
  });

  it("refuses a Power that is not in the catalogue", async () => {
    const { id } = await createRole("typo");

    const res = await call(bossUserId, "PUT", `/roles/${id}/powers`, { powers: ["company:menu:items:fly"] });

    expect(res.status).toBe(400);
    expect((await json(res)).error?.message).toContain("company:menu:items:fly");
  });

  it("refuses a platform Power on a tenant role", async () => {
    const { id } = await createRole("climber");

    const res = await call(bossUserId, "PUT", `/roles/${id}/powers`, {
      powers: ["platform:admin:invite_codes:read"],
    });

    expect(res.status).toBe(400);
  });

  it("refuses to take a Power from a system role", async () => {
    const master = await roleByKey("tenant_admin");
    const detail = await json(await call(bossUserId, "GET", `/roles/${master.id}`));

    const res = await call(bossUserId, "PUT", `/roles/${master.id}/powers`, {
      powers: detail.data.powers.slice(1),
    });

    expect(res.status).toBe(409);
    const after = await json(await call(bossUserId, "GET", `/roles/${master.id}`));
    expect(after.data.powers).toEqual(detail.data.powers);
  });

  it("applies at once to people who hold the role", async () => {
    const storeStaff = await roleByKey("store_staff");
    const before = await json(await call(bossUserId, "GET", `/roles/${storeStaff.id}`));
    const extra = "company:menu:items:update";
    expect(before.data.powers).not.toContain(extra);

    await call(bossUserId, "PUT", `/roles/${storeStaff.id}/powers`, { powers: [...before.data.powers, extra] });
    const [power] = await db.select().from(accessMasterPowers).where(eq(accessMasterPowers.power, extra));
    const grants = await db
      .select()
      .from(accessRolePowers)
      .where(eq(accessRolePowers.masterRoleId, storeStaff.id));
    expect(grants.map((grant) => grant.masterPowerId)).toContain(power.id);

    await call(bossUserId, "PUT", `/roles/${storeStaff.id}/powers`, { powers: before.data.powers });
  });
});

describe("deleting a role", () => {
  it("removes an unused role with its Role rows and Powers, and keeps the audit trail", async () => {
    const { id } = await createRole("scratch");
    await call(bossUserId, "PUT", `/roles/${id}/powers`, { powers: ["company:menu:items:read"] });
    await call(bossUserId, "PUT", `/roles/${id}/enabled`, { enabled: true });

    const res = await call(bossUserId, "DELETE", `/roles/${id}`);

    expect(res.status).toBe(200);
    expect(await db.select().from(accessMasterRoles).where(eq(accessMasterRoles.id, id))).toHaveLength(0);
    expect(await db.select().from(roles).where(eq(roles.masterRoleId, id))).toHaveLength(0);
    expect(await db.select().from(accessRolePowers).where(eq(accessRolePowers.masterRoleId, id))).toHaveLength(0);
    const log = await json(await call(bossUserId, "GET", `/role-audit-log?roleId=${id}`));
    expect(log.data[0]).toMatchObject({ action: "role.deleted", after: null });
  });

  it("refuses a system role", async () => {
    const master = await roleByKey("superuser");

    expect((await call(bossUserId, "DELETE", `/roles/${master.id}`)).status).toBe(409);
  });

  it("refuses a role someone holds, and says to disable it", async () => {
    const master = await roleByKey("store_staff");

    const res = await call(bossUserId, "DELETE", `/roles/${master.id}`);

    expect(res.status).toBe(409);
    expect((await json(res)).error?.message).toContain("Disable it instead");
  });

  it("answers not found for a role that does not exist", async () => {
    const res = await call(bossUserId, "DELETE", `/roles/${crypto.randomUUID()}`);

    expect(res.status).toBe(404);
  });
});

describe("the audit log", () => {
  it("lists newest first and honours the limit", async () => {
    const { id } = await createRole("ledger");
    await call(bossUserId, "PUT", `/roles/${id}/enabled`, { enabled: true });
    await call(bossUserId, "PUT", `/roles/${id}/enabled`, { enabled: false });

    const log = await json(await call(bossUserId, "GET", `/role-audit-log?roleId=${id}&limit=2`));

    expect(log.data.map((entry: { action: string }) => entry.action)).toEqual(["role.disabled", "role.enabled"]);
  });

  it("refuses to change or remove an entry", async () => {
    const [entry] = await db.select().from(accessAuditLog).limit(1);

    await expect(db.update(accessAuditLog).set({ action: "role.forged" }).where(eq(accessAuditLog.id, entry.id))).rejects.toMatchObject({
      cause: { message: "access_audit_log is append-only" },
    });
    await expect(db.delete(accessAuditLog).where(eq(accessAuditLog.id, entry.id))).rejects.toMatchObject({
      cause: { message: "access_audit_log is append-only" },
    });
  });
});

describe("the Power catalogue", () => {
  it("is in the database in full, nothing more", async () => {
    const rows = await db.select({ power: accessMasterPowers.power }).from(accessMasterPowers);

    expect(rows.map((row) => row.power).toSorted()).toEqual([...ACCESS_POWERS].toSorted());
  });

  it("is brought back by the sync, which then has nothing left to add", async () => {
    const power = "company:chats:threads:read";
    const [row] = await db.select().from(accessMasterPowers).where(eq(accessMasterPowers.power, power));
    await db.delete(accessRolePowers).where(eq(accessRolePowers.masterPowerId, row.id));
    await db.delete(accessMasterPowers).where(eq(accessMasterPowers.power, power));

    const first = await syncAccessMasterPowers(db);
    const second = await syncAccessMasterPowers(db);

    expect(first).toEqual({ added: [power], retired: [] });
    expect(second).toEqual({ added: [], retired: [] });
  });

  it("reports a Power the catalogue no longer has, and leaves it alone", async () => {
    await db.insert(accessMasterPowers).values({ power: "company:ghost:things:read", scope: "tenant" });

    const result = await syncAccessMasterPowers(db);

    expect(result).toEqual({ added: [], retired: ["company:ghost:things:read"] });
    const [ghost] = await db
      .select()
      .from(accessMasterPowers)
      .where(eq(accessMasterPowers.power, "company:ghost:things:read"));
    expect(ghost).toBeDefined();
  });
});

describe("binding a role's members", () => {
  const flagOf = async (key: string) => (await roleByKey(key))?.canBeBound;

  it("starts on for Store admin and Store staff, off for Tenant admin and Superuser", async () => {
    expect(await flagOf("store_admin")).toBe(true);
    expect(await flagOf("store_staff")).toBe(true);
    expect(await flagOf("tenant_admin")).toBe(false);
    expect(await flagOf("superuser")).toBe(false);
    const { data } = await json(await call(bossUserId, "GET", "/roles"));
    expect(data.find((role: { key: string }) => role.key === "store_staff").canBeBound).toBe(true);
  });

  it("starts a new role off", async () => {
    const created = await createRole("bind_default");
    const { data } = await json(await call(bossUserId, "GET", `/roles/${created.id}`));
    expect(data.canBeBound).toBe(false);
  });

  it("turns on and off, with the old and new value in the audit log", async () => {
    const created = await createRole("bind_toggle");

    const on = await call(bossUserId, "PATCH", `/roles/${created.id}`, { canBeBound: true });
    expect(on.status).toBe(200);
    expect((await json(on)).data.canBeBound).toBe(true);
    const off = await call(bossUserId, "PATCH", `/roles/${created.id}`, { canBeBound: false });
    expect((await json(off)).data.canBeBound).toBe(false);

    const log = await json(await call(bossUserId, "GET", `/role-audit-log?roleId=${created.id}`));
    const entries = log.data.filter((entry: { action: string }) => entry.action === "role.can_be_bound_set");
    expect(entries.map((entry: { before: unknown; after: unknown }) => [entry.before, entry.after])).toEqual([
      [{ canBeBound: true }, { canBeBound: false }],
      [{ canBeBound: false }, { canBeBound: true }],
    ]);
    expect(entries[0].actorEmail).toBe("boss@amelie.test");
  });

  it("writes no audit entry when the value does not change", async () => {
    const created = await createRole("bind_same");
    await call(bossUserId, "PATCH", `/roles/${created.id}`, { canBeBound: false });
    const log = await json(await call(bossUserId, "GET", `/role-audit-log?roleId=${created.id}`));
    expect(log.data.map((entry: { action: string }) => entry.action)).toEqual(["role.created"]);
  });

  it("refuses to turn it on for a system role or a platform role", async () => {
    const tenantAdmin = await roleByKey("tenant_admin");
    const superuser = await roleByKey("superuser");
    const system = await call(bossUserId, "PATCH", `/roles/${tenantAdmin.id}`, { canBeBound: true });
    const platform = await call(bossUserId, "PATCH", `/roles/${superuser.id}`, { canBeBound: true });
    expect(system.status).toBe(409);
    expect(platform.status).toBeGreaterThanOrEqual(400);
    expect(await flagOf("tenant_admin")).toBe(false);
    expect(await flagOf("superuser")).toBe(false);
  });

  it("is ruled out in the database for a system role or a platform role", async () => {
    await expect(
      db.update(accessMasterRoles).set({ canBeBound: true }).where(eq(accessMasterRoles.key, "tenant_admin")),
    ).rejects.toThrow(/Failed query/);
    await expect(
      db.update(accessMasterRoles).set({ canBeBound: true }).where(eq(accessMasterRoles.key, "superuser")),
    ).rejects.toThrow(/Failed query/);
  });

  it("says how many members still have bindings when turning it off is refused", () => {
    expect(adminRoleStillBound(3)).toBe("Cannot turn this off: 3 members still have bindings. Clear them first.");
    expect(adminRoleStillBound(1)).toBe("Cannot turn this off: 1 member still has bindings. Clear them first.");
  });
});
