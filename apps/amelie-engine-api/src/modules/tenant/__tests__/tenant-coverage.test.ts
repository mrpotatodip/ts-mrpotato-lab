import { beforeAll, describe, expect, it, vi } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import type { Coverage, Tenant } from "@repo/contracts/amelie";
import { partyRoles, partyRoleScopes, tenantCountries, tenantLocations } from "@repo/db-amelie";
import type { DbConnectType } from "#/lib/db-connection";
import { runEffect } from "#/lib/effect-query";
import type { AppEnv } from "#/types/variables";
import { covers, requireTenantMember } from "#/modules/tenant";
import { getTenantSvc, listTenantsSvc } from "#/modules/tenant/handlers";
import {
  createTestPglite,
  defaultLocationId,
  insertCountry,
  insertLocation,
  insertMember,
  insertPersonWithLogin,
  insertTenant,
} from "#/__tests__/amelie-test-db";

let db: DbConnectType;
let pg: PGlite;
let connectionString: string;
let tenantId: string;
let usCountryId: string;
let caCountryId: string;
let downtownId: string;
let airportId: string;
let torontoId: string;
let admin: { userId: string; partyId: string };
let staff: { userId: string; partyId: string };

const memberRoleId = async (partyId: string) => {
  const [member] = await db.select({ id: partyRoles.id }).from(partyRoles).where(eq(partyRoles.partyId, partyId));
  return member.id;
};
const bind = async (partyId: string, target: { countryId: string } | { locationId: string }) => {
  await db.insert(partyRoleScopes).values({ tenantId, partyRoleId: await memberRoleId(partyId), ...target });
};
const unbind = async (partyId: string) => {
  await db.delete(partyRoleScopes).where(eq(partyRoleScopes.partyRoleId, await memberRoleId(partyId)));
};
const coverageOf = async (userId: string) => (await runEffect(getTenantSvc(db, userId, tenantId))).coverage;
const sorted = (coverage: Coverage) => (coverage === "all" ? [] : coverage.toSorted());

const queriesSentBy = async (call: () => Promise<Tenant>) => {
  const spy = vi.spyOn(pg, "query");
  await call();
  const sent = spy.mock.calls.length;
  spy.mockRestore();
  return sent;
};

beforeAll(async () => {
  const created = await createTestPglite();
  db = created.db;
  pg = created.pg;
  const server = new PGLiteSocketServer({ db: created.pg, port: 0, maxConnections: 500 });
  await server.start();
  connectionString = `postgresql://postgres@${server.getServerConn()}/postgres`;
  tenantId = await insertTenant(db, "Sorella", "sorella");
  const [us] = await db.select({ id: tenantCountries.id }).from(tenantCountries).where(eq(tenantCountries.tenantId, tenantId));
  usCountryId = us.id;
  caCountryId = await insertCountry(db, tenantId, { country: "CA", currency: "CAD" });
  downtownId = await defaultLocationId(db, tenantId);
  airportId = await insertLocation(db, tenantId, { name: "Airport", slug: "airport" });
  torontoId = await insertLocation(db, tenantId, { name: "Toronto", slug: "toronto", countryId: caCountryId });
  admin = await insertPersonWithLogin(db, "admin@example.com");
  await insertMember(db, tenantId, admin.partyId, "tenant_admin");
  staff = await insertPersonWithLogin(db, "staff@example.com");
  await insertMember(db, tenantId, staff.partyId, "store_staff");
});

describe("covers", () => {
  it("covers anything under all, and only the listed Locations otherwise", () => {
    expect(covers("all", ["x"])).toBe(true);
    expect(covers(["a", "b"], ["a"])).toBe(true);
    expect(covers(["a", "b"], ["a", "c"])).toBe(false);
    expect(covers([], ["a"])).toBe(false);
  });
});

describe("Tenant coverage", () => {
  it("is all for a member with no bindings and for the tenant admin", async () => {
    expect(await coverageOf(staff.userId)).toBe("all");
    expect(await coverageOf(admin.userId)).toBe("all");
  });

  it("lists the bound Location only", async () => {
    await bind(staff.partyId, { locationId: airportId });
    expect(await coverageOf(staff.userId)).toEqual([airportId]);
    await unbind(staff.partyId);
  });

  it("expands a Country binding, including a Location opened afterwards", async () => {
    await bind(staff.partyId, { countryId: usCountryId });
    expect(sorted(await coverageOf(staff.userId))).toEqual([downtownId, airportId].toSorted());
    const later = await insertLocation(db, tenantId, { name: "Harbour", slug: "harbour" });
    expect(await coverageOf(staff.userId)).toContain(later);
    await db.update(tenantLocations).set({ archivedAt: new Date() }).where(eq(tenantLocations.id, later));
    await unbind(staff.partyId);
  });

  it("mixes a Country with a Location in another Country", async () => {
    await bind(staff.partyId, { countryId: caCountryId });
    await bind(staff.partyId, { locationId: airportId });
    expect(sorted(await coverageOf(staff.userId))).toEqual([torontoId, airportId].toSorted());
    await unbind(staff.partyId);
  });

  it("drops archived Locations and ignores an archived Country binding", async () => {
    const closed = await insertLocation(db, tenantId, { name: "Closed", slug: "closed" });
    await bind(staff.partyId, { locationId: closed });
    await db.update(tenantLocations).set({ archivedAt: new Date() }).where(eq(tenantLocations.id, closed));
    const oldCountry = await insertCountry(db, tenantId, { country: "MX", currency: "MXN" });
    await insertLocation(db, tenantId, { name: "Cancun", slug: "cancun", countryId: oldCountry });
    await bind(staff.partyId, { countryId: oldCountry });
    await db.update(tenantCountries).set({ archivedAt: new Date() }).where(eq(tenantCountries.id, oldCountry));
    await bind(staff.partyId, { locationId: airportId });
    expect(await coverageOf(staff.userId)).toEqual([airportId]);
    await unbind(staff.partyId);
  });

  it("is an empty list, not all, when every binding is archived", async () => {
    const gone = await insertLocation(db, tenantId, { name: "Gone", slug: "gone" });
    await bind(staff.partyId, { locationId: gone });
    await db.update(tenantLocations).set({ archivedAt: new Date() }).where(eq(tenantLocations.id, gone));
    expect(await coverageOf(staff.userId)).toEqual([]);
    await unbind(staff.partyId);
  });

  it("is on every Tenant the list returns", async () => {
    await bind(staff.partyId, { locationId: airportId });
    const listed = await runEffect(listTenantsSvc(db, staff.userId));
    expect(listed.map((tenant) => tenant.coverage)).toEqual([[airportId]]);
    await unbind(staff.partyId);
  });

  it("sends no extra query for a member with no bindings or for the tenant admin, one for a bound member", async () => {
    const free = await queriesSentBy(() => runEffect(getTenantSvc(db, staff.userId, tenantId)));
    const owner = await queriesSentBy(() => runEffect(getTenantSvc(db, admin.userId, tenantId)));
    expect(owner).toBe(free);

    await bind(staff.partyId, { locationId: airportId });
    const bound = await queriesSentBy(() => runEffect(getTenantSvc(db, staff.userId, tenantId)));
    expect(bound).toBe(free + 1);
    await unbind(staff.partyId);
  });
});

describe("requireTenantMember", () => {
  it("puts the coverage on the context next to the powers", async () => {
    await bind(staff.partyId, { locationId: airportId });
    const app = new Hono<AppEnv>();
    app.use("*", async (c, next) => {
      c.set("userId", staff.userId);
      await next();
    });
    app.use("*", requireTenantMember);
    app.get("/probe", (c) => c.json({ coverage: c.get("coverage"), powers: c.get("powers") }));
    // SAFETY: only the connection string is read from the bindings.
    const env = { HYPERDRIVE_REALTIME: { connectionString } } as never;
    const res = await app.fetch(new Request(`http://localhost/probe?tenantId=${tenantId}`), env);
    // SAFETY: the probe route above returns exactly this JSON.
    const body = (await res.json()) as { coverage: unknown; powers: string[] };
    expect(body.coverage).toEqual([airportId]);
    expect(body.powers.length).toBeGreaterThan(0);
    await unbind(staff.partyId);
  });
});
