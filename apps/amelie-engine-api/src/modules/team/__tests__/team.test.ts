import { beforeAll, describe, expect, it } from "vitest";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { authUser, accessMasterPowers, accessMasterRoles, accessRolePowers } from "@repo/db-amelie";
import { ACCESS_ROLE_GRANTS } from "@repo/contracts/amelie";
import { AppError } from "#/lib/errors";
import { runEffect } from "#/lib/effect-query";
import type { AppEnv } from "#/types/variables";
import teamRestAPI, {
  acceptTeamInviteSvc,
  createTeamInviteSvc,
  getTeamInvitePreviewSvc,
  publicTeamInviteAPI,
} from "#/modules/team";
import { requireTenantMember } from "#/modules/tenant";
import {
  createTestPglite,
  insertMember,
  insertPersonWithLogin,
  insertTenant,
} from "#/__tests__/amelie-test-db";
import type { DbConnectType } from "#/lib/db-connection";

type TestUsers = { tenant_admin: string; store_admin: string; store_staff: string };

let db: DbConnectType;
let tenantId: string;
let adminPartyId: string;
let staffPartyId: string;
let connectionString: string;
const users: TestUsers = { tenant_admin: "", store_admin: "", store_staff: "" };

const app = new Hono<AppEnv>();
app.onError((err, c) => {
  if (err instanceof AppError) {
    return c.json({ data: null, error: { code: err.code, message: err.message } }, err.statusCode as 403);
  }
  throw err;
});
app.use("/team/*", async (c, next) => {
  c.set("userId", c.req.header("X-Test-User") ?? "");
  await next();
});
app.use("/team", async (c, next) => {
  c.set("userId", c.req.header("X-Test-User") ?? "");
  await next();
});
app.use("/team/*", requireTenantMember);
app.use("/team", requireTenantMember);
app.route("/team", teamRestAPI);
app.route("/public/team-invites", publicTeamInviteAPI);

const call = (as: keyof TestUsers, method: string, path: string, body?: Record<string, string>) =>
  app.fetch(
    new Request(`http://localhost/team${path}?tenantId=${tenantId}`, {
      method,
      headers: { "X-Test-User": users[as], "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    }),
    { HYPERDRIVE_REALTIME: { connectionString } } as never,
  );

beforeAll(async () => {
  const created = await createTestPglite();
  db = created.db;
  const server = new PGLiteSocketServer({ db: created.pg, port: 0, maxConnections: 50 });
  await server.start();
  connectionString = `postgresql://postgres@${server.getServerConn()}/postgres`;
  tenantId = await insertTenant(db, "Sorella", "sorella");
  for (const role of ["tenant_admin", "store_admin", "store_staff"] as const) {
    const login = await insertPersonWithLogin(db, `${role}@example.com`);
    await insertMember(db, tenantId, login.partyId, role);
    users[role] = login.userId;
    if (role === "tenant_admin") adminPartyId = login.partyId;
    if (role === "store_staff") staffPartyId = login.partyId;
  }
});

describe("Team routes by Role", () => {
  it("lets every team member list the roster", async () => {
    const res = await call("store_staff", "GET", "");
    expect(res.status).toBe(200);
    const { data } = await res.json();
    expect(data.members).toHaveLength(3);
  });

  it.each(["store_admin", "store_staff"] as const)("keeps a %s from inviting", async (role) => {
    const res = await call(role, "POST", "/invites", { email: `${role}-invite@example.com`, role: "store_staff" });
    expect(res.status).toBe(403);
  });

  it("lets a tenant_admin invite, change the pending Role, and revoke", async () => {
    const created = await call("tenant_admin", "POST", "/invites", { email: "leo@example.com", role: "store_staff", bindings: [] });
    expect(created.status).toBe(201);
    const { data } = await created.json();
    expect(data.token).toMatch(/^[0-9a-f]{64}$/);
    expect(data.invite).toMatchObject({ email: "leo@example.com", role: "store_staff", bindings: [] });

    const changed = await call("tenant_admin", "PATCH", `/invites/${data.invite.id}`, { role: "store_admin" });
    expect(changed.status).toBe(200);
    expect(await changed.json()).toMatchObject({ data: { role: "store_admin" }, error: null });

    const again = await call("tenant_admin", "POST", "/invites", { email: "leo@example.com", role: "store_staff", bindings: [] });
    expect(again.status).toBe(201);
    const replaced = await again.json();
    expect(replaced.data.invite.id).not.toBe(data.invite.id);

    const revoked = await call("tenant_admin", "DELETE", `/invites/${replaced.data.invite.id}`);
    expect(revoked.status).toBe(200);
  });

  it("refuses an email already on the Tenant", async () => {
    const res = await call("tenant_admin", "POST", "/invites", { email: "store_staff@example.com", role: "store_staff", bindings: [] });
    expect(res.status).toBe(409);
  });

  it("refuses removing the last tenant_admin", async () => {
    const res = await call("tenant_admin", "DELETE", `/members/${adminPartyId}`);
    expect(res.status).toBe(409);
  });

  it("lets a tenant_admin change and remove another team member", async () => {
    const changed = await call("tenant_admin", "PATCH", `/members/${staffPartyId}`, { role: "store_admin", bindings: [] });
    expect(changed.status).toBe(200);
    expect((await changed.json()).data.members.find((row: { partyId: string }) => row.partyId === staffPartyId).role).toBe(
      "store_admin",
    );

    const removed = await call("tenant_admin", "DELETE", `/members/${staffPartyId}`);
    expect(removed.status).toBe(200);
  });

  it("follows access_role_powers, not the Role key", async () => {
    const [storeAdminMaster] = await db.select().from(accessMasterRoles).where(eq(accessMasterRoles.key, "store_admin"));
    const [invitePower] = await db
      .select()
      .from(accessMasterPowers)
      .where(eq(accessMasterPowers.power, "company:team:invites:create"));
    await db.insert(accessRolePowers).values({ masterRoleId: storeAdminMaster.id, masterPowerId: invitePower.id, scope: "tenant" });
    const res = await call("store_admin", "POST", "/invites", { email: "flag@example.com", role: "store_staff", bindings: [] });
    await db
      .delete(accessRolePowers)
      .where(
        and(
          eq(accessRolePowers.masterRoleId, storeAdminMaster.id),
          eq(accessRolePowers.masterPowerId, invitePower.id),
        ),
      );
    expect(res.status).toBe(201);
  });
});

describe("Team invite accept", () => {
  it("lets a new Person join with name and password", async () => {
    const created = await runEffect(
      createTeamInviteSvc(db, tenantId, users.tenant_admin, ACCESS_ROLE_GRANTS.tenant_admin, { email: "new@example.com", role: "store_staff", bindings: [] }),
    );
    const preview = await runEffect(getTeamInvitePreviewSvc(db, created.token));
    expect(preview).toMatchObject({ cafeName: "Sorella", email: "new@example.com", role: "store_staff", hasAccount: false });

    const accepted = await runEffect(
      acceptTeamInviteSvc(db, created.token, null, {
        firstName: "New",
        lastName: "Person",
        password: "correct-horse",
      }),
    );
    expect(accepted.tenantId).toBe(tenantId);
    const [login] = await db.select().from(authUser).where(eq(authUser.email, "new@example.com"));
    expect(login).toMatchObject({ email: "new@example.com" });
  });

  it("lets an existing login accept while signed in as that email", async () => {
    const other = await insertPersonWithLogin(db, "other@example.com");
    const created = await runEffect(
      createTeamInviteSvc(db, tenantId, users.tenant_admin, ACCESS_ROLE_GRANTS.tenant_admin, { email: "other@example.com", role: "store_admin", bindings: [] }),
    );
    await expect(runEffect(acceptTeamInviteSvc(db, created.token, null, {}))).rejects.toMatchObject({
      statusCode: 403,
    });
    await expect(runEffect(acceptTeamInviteSvc(db, created.token, users.tenant_admin, {}))).rejects.toMatchObject({
      statusCode: 403,
    });
    const accepted = await runEffect(acceptTeamInviteSvc(db, created.token, other.userId, {}));
    expect(accepted.tenantId).toBe(tenantId);
  });

  it("hides an expired token", async () => {
    const created = await runEffect(
      createTeamInviteSvc(db, tenantId, users.tenant_admin, ACCESS_ROLE_GRANTS.tenant_admin, { email: "late@example.com", role: "store_staff", bindings: [] }),
    );
    const later = new Date(Date.now() + 8 * 24 * 60 * 60 * 1000);
    await expect(runEffect(getTeamInvitePreviewSvc(db, created.token, later))).rejects.toMatchObject({
      statusCode: 404,
    });
  });
});

describe("Assigning Roles", () => {
  const grantInviteCreate = async (roleKey: string) => {
    const [master] = await db.select().from(accessMasterRoles).where(eq(accessMasterRoles.key, roleKey));
    const [power] = await db
      .select()
      .from(accessMasterPowers)
      .where(eq(accessMasterPowers.power, "company:team:invites:create"));
    await db.insert(accessRolePowers).values({ masterRoleId: master.id, masterPowerId: power.id, scope: "tenant" });
    return async () => {
      await db
        .delete(accessRolePowers)
        .where(and(eq(accessRolePowers.masterRoleId, master.id), eq(accessRolePowers.masterPowerId, power.id)));
    };
  };

  it("lists the Roles a tenant_admin can assign, fewest Powers first", async () => {
    const res = await call("tenant_admin", "GET", "/roles");

    expect(res.status).toBe(200);
    const { data } = await res.json();
    expect(data.map((role: { key: string }) => role.key)).toEqual(["store_staff", "store_admin", "tenant_admin"]);
    expect(data[0]).toMatchObject({ key: "store_staff", label: "Store staff" });
  });

  it("lists only the Roles whose Powers the caller holds in full", async () => {
    const undo = await grantInviteCreate("store_admin");
    const res = await call("store_admin", "GET", "/roles");
    await undo();

    const { data } = await res.json();
    expect(data.map((role: { key: string }) => role.key)).toEqual(["store_staff", "store_admin"]);
  });

  it("refuses an invite for a Role above the caller's own Powers", async () => {
    const undo = await grantInviteCreate("store_admin");
    const res = await call("store_admin", "POST", "/invites", { email: "climb@example.com", role: "tenant_admin", bindings: [] });
    await undo();

    expect(res.status).toBe(403);
  });

  it("refuses to change a member whose Role is above the caller's own Powers", async () => {
    const [master] = await db.select().from(accessMasterRoles).where(eq(accessMasterRoles.key, "store_admin"));
    const [power] = await db
      .select()
      .from(accessMasterPowers)
      .where(eq(accessMasterPowers.power, "company:team:members:update"));
    await db.insert(accessRolePowers).values({ masterRoleId: master.id, masterPowerId: power.id, scope: "tenant" });
    const res = await call("store_admin", "PATCH", `/members/${adminPartyId}`, { role: "store_staff", bindings: [] });
    await db
      .delete(accessRolePowers)
      .where(and(eq(accessRolePowers.masterRoleId, master.id), eq(accessRolePowers.masterPowerId, power.id)));

    expect(res.status).toBe(403);
  });

  it("treats a disabled Master Role as not found", async () => {
    await db.update(accessMasterRoles).set({ enabled: false }).where(eq(accessMasterRoles.key, "store_staff"));
    const res = await call("tenant_admin", "POST", "/invites", { email: "off@example.com", role: "store_staff", bindings: [] });
    const list = await call("tenant_admin", "GET", "/roles");
    await db.update(accessMasterRoles).set({ enabled: true }).where(eq(accessMasterRoles.key, "store_staff"));

    expect(res.status).toBe(404);
    expect((await list.json()).data.map((role: { key: string }) => role.key)).toEqual(["store_admin", "tenant_admin"]);
  });

  it("returns the Role label on members and invites", async () => {
    const res = await call("tenant_admin", "GET", "");

    const { data } = await res.json();
    expect(data.members.find((m: { role: string }) => m.role === "store_staff")).toMatchObject({
      roleLabel: "Store staff",
    });
  });
});
