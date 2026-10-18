import { beforeAll, describe, expect, it } from "vitest";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { TeamBindingsSchema } from "@repo/contracts/amelie";
import { accessAuditLog, partyRoles, partyRoleScopes, tenantLocations } from "@repo/db-amelie";
import { AppError } from "#/lib/errors";
import type { AppEnv } from "#/types/variables";
import teamRestAPI from "#/modules/team";
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
let adminUserId: string;
let adminPartyId: string;
let staffPartyId: string;
let usCountryId: string;
let caCountryId: string;
let usLocationId: string;
let airportId: string;
let torontoId: string;

const app = new Hono<AppEnv>();
app.onError((err, c) => {
  if (err instanceof AppError) {
    // SAFETY: AppError subclasses only use 4xx/5xx codes.
    return c.json({ data: null, error: { code: err.code, message: err.message } }, err.statusCode as 403);
  }
  throw err;
});
app.use("/team/*", async (c, next) => {
  c.set("userId", c.req.header("X-Test-User") ?? "");
  await next();
});
app.use("/team/*", requireTenantMember);
app.use("/team", async (c, next) => {
  c.set("userId", c.req.header("X-Test-User") ?? "");
  await next();
});
app.use("/team", requireTenantMember);
app.route("/team", teamRestAPI);

// SAFETY: only the connection string is read from the bindings.
const env = () => ({ HYPERDRIVE_REALTIME: { connectionString } }) as never;

const TeamRoster = z.object({
  members: z.array(z.object({ partyId: z.string(), canBeBound: z.boolean(), bindings: TeamBindingsSchema })),
});
const AuditSet = z.object({ tenantId: z.string(), bindings: TeamBindingsSchema });

const patchMember = (partyId: string, body: { role: string; bindings?: { kind: string; id: string }[] }) =>
  app.fetch(
    new Request(`http://localhost/team/members/${partyId}?tenantId=${tenantId}`, {
      method: "PATCH",
      headers: { "X-Test-User": adminUserId, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
    env(),
  );

const getTeam = async () => {
  const res = await app.fetch(
    new Request(`http://localhost/team?tenantId=${tenantId}`, { headers: { "X-Test-User": adminUserId } }),
    env(),
  );
  return TeamRoster.parse((await res.json()).data);
};

const bindingsOf = async (partyId: string) =>
  (await getTeam()).members.find((m) => m.partyId === partyId)?.bindings ?? [];

const auditOf = async (partyId: string) =>
  (await db.select().from(accessAuditLog).where(eq(accessAuditLog.subjectId, partyId))).filter(
    (row) => row.action === "team.member_bindings_set",
  );

beforeAll(async () => {
  const created = await createTestPglite();
  db = created.db;
  const server = new PGLiteSocketServer({ db: created.pg, port: 0, maxConnections: 500 });
  await server.start();
  connectionString = `postgresql://postgres@${server.getServerConn()}/postgres`;
  tenantId = await insertTenant(db, "Sorella", "sorella");
  const admin = await insertPersonWithLogin(db, "admin@example.com");
  await insertMember(db, tenantId, admin.partyId, "tenant_admin");
  adminUserId = admin.userId;
  adminPartyId = admin.partyId;
  const staff = await insertPersonWithLogin(db, "staff@example.com");
  await insertMember(db, tenantId, staff.partyId, "store_staff");
  staffPartyId = staff.partyId;

  usLocationId = await defaultLocationId(db, tenantId);
  const [usLocation] = await db.select().from(tenantLocations).where(eq(tenantLocations.id, usLocationId));
  usCountryId = usLocation.countryId;
  airportId = await insertLocation(db, tenantId, { name: "Airport", slug: "airport" });
  caCountryId = await insertCountry(db, tenantId, { country: "CA", currency: "CAD" });
  torontoId = await insertLocation(db, tenantId, { name: "Toronto", slug: "toronto", countryId: caCountryId });
});

describe("Binding a team member", () => {
  it("keeps a member cafe-wide until bindings are saved", async () => {
    expect(await bindingsOf(staffPartyId)).toEqual([]);
    const members = (await getTeam()).members;
    expect(members.find((m) => m.partyId === staffPartyId)?.canBeBound).toBe(true);
    expect(members.find((m) => m.partyId === adminPartyId)?.canBeBound).toBe(false);
  });

  it("binds a member to a Country and to Locations, mixed", async () => {
    const res = await patchMember(staffPartyId, {
      role: "store_staff",
      bindings: [
        { kind: "country", id: caCountryId },
        { kind: "location", id: airportId },
      ],
    });
    expect(res.status).toBe(200);
    const bindings = await bindingsOf(staffPartyId);
    expect(bindings).toHaveLength(2);
    expect(bindings).toEqual(
      expect.arrayContaining([
        { kind: "country", id: caCountryId },
        { kind: "location", id: airportId },
      ]),
    );
  });

  it("folds away a Location that its bound Country already covers", async () => {
    await patchMember(staffPartyId, {
      role: "store_staff",
      bindings: [
        { kind: "country", id: caCountryId },
        { kind: "location", id: torontoId },
        { kind: "location", id: airportId },
      ],
    });
    const bindings = await bindingsOf(staffPartyId);
    expect(bindings).toHaveLength(2);
    expect(bindings).toEqual(
      expect.arrayContaining([
        { kind: "country", id: caCountryId },
        { kind: "location", id: airportId },
      ]),
    );
  });

  it("leaves bindings alone when the request names none", async () => {
    await patchMember(staffPartyId, { role: "store_staff" });
    expect(await bindingsOf(staffPartyId)).toHaveLength(2);
  });

  it("refuses a Country or Location from another Tenant", async () => {
    const other = await insertTenant(db, "Elsewhere", "elsewhere");
    const foreignCountry = await insertCountry(db, other, { country: "FR", currency: "EUR" });
    const res = await patchMember(staffPartyId, {
      role: "store_staff",
      bindings: [{ kind: "country", id: foreignCountry }],
    });
    expect(res.status).toBe(400);
    expect(await bindingsOf(staffPartyId)).toHaveLength(2);
  });

  it("clears the bindings on Whole cafe and records who, before and after", async () => {
    const res = await patchMember(staffPartyId, { role: "store_staff", bindings: [] });
    expect(res.status).toBe(200);
    expect(await bindingsOf(staffPartyId)).toEqual([]);

    const [entry] = (await auditOf(staffPartyId)).slice(-1);
    expect(entry.actorPartyId).toBe(adminPartyId);
    expect(AuditSet.parse(entry.before).bindings).toHaveLength(2);
    expect(AuditSet.parse(entry.after).bindings).toEqual([]);
  });

  it("writes no audit entry when the set does not change", async () => {
    const before = (await auditOf(staffPartyId)).length;
    await patchMember(staffPartyId, { role: "store_staff", bindings: [] });
    expect((await auditOf(staffPartyId)).length).toBe(before);
  });

  it("clears bindings when the member moves to a Role that cannot be bound", async () => {
    await patchMember(staffPartyId, { role: "store_staff", bindings: [{ kind: "location", id: usLocationId }] });
    expect(await bindingsOf(staffPartyId)).toHaveLength(1);
    const res = await patchMember(staffPartyId, { role: "tenant_admin" });
    expect(res.status).toBe(200);
    expect(await bindingsOf(staffPartyId)).toEqual([]);
    expect((await auditOf(staffPartyId)).at(-1)?.after).toEqual({ tenantId, bindings: [] });
    await patchMember(staffPartyId, { role: "store_staff" });
  });

  it("refuses bindings sent with a Role that cannot be bound", async () => {
    const res = await patchMember(staffPartyId, {
      role: "tenant_admin",
      bindings: [{ kind: "country", id: usCountryId }],
    });
    expect(res.status).toBe(400);
  });

  it("removes a member's bindings with the member and records it", async () => {
    const other = await insertPersonWithLogin(db, "gone@example.com");
    await insertMember(db, tenantId, other.partyId, "store_staff");
    await patchMember(other.partyId, { role: "store_staff", bindings: [{ kind: "country", id: usCountryId }] });
    const res = await app.fetch(
      new Request(`http://localhost/team/members/${other.partyId}?tenantId=${tenantId}`, {
        method: "DELETE",
        headers: { "X-Test-User": adminUserId },
      }),
      env(),
    );
    expect(res.status).toBe(200);
    expect((await db.select().from(partyRoleScopes)).filter((row) => row.countryId === usCountryId)).toHaveLength(0);
    expect((await auditOf(other.partyId)).at(-1)?.after).toEqual({ tenantId, bindings: [] });
  });
});

describe("party_role_scopes in the database", () => {
  const roleRow = async () => {
    const [row] = await db.select().from(partyRoles).where(eq(partyRoles.partyId, staffPartyId));
    return row;
  };

  it("allows exactly one of Country or Location per row", async () => {
    const role = await roleRow();
    await expect(db.insert(partyRoleScopes).values({ tenantId, partyRoleId: role.id })).rejects.toThrow(
      /Failed query/,
    );
    await expect(
      db
        .insert(partyRoleScopes)
        .values({ tenantId, partyRoleId: role.id, countryId: usCountryId, locationId: usLocationId }),
    ).rejects.toThrow(/Failed query/);
  });

  it("allows a Country or Location only once per member", async () => {
    const role = await roleRow();
    await db.insert(partyRoleScopes).values({ tenantId, partyRoleId: role.id, countryId: usCountryId });
    await expect(
      db.insert(partyRoleScopes).values({ tenantId, partyRoleId: role.id, countryId: usCountryId }),
    ).rejects.toThrow(/Failed query/);
    await db.delete(partyRoleScopes).where(eq(partyRoleScopes.partyRoleId, role.id));
  });

  it("keeps every row inside the member's own Tenant", async () => {
    const role = await roleRow();
    const other = await insertTenant(db, "Third", "third");
    const foreignCountry = await insertCountry(db, other, { country: "DE", currency: "EUR" });
    await expect(
      db.insert(partyRoleScopes).values({ tenantId, partyRoleId: role.id, countryId: foreignCountry }),
    ).rejects.toThrow(/Failed query/);
    await expect(
      db.insert(partyRoleScopes).values({ tenantId: other, partyRoleId: role.id, countryId: foreignCountry }),
    ).rejects.toThrow(/Failed query/);
  });
});
