import { beforeAll, describe, expect, it } from "vitest";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { partyRoles, partyRoleScopes, tenantFaqs, tenantLocations } from "@repo/db-amelie";
import { AppError } from "#/lib/errors";
import type { AppEnv } from "#/types/variables";
import faqRestAPI from "#/modules/faq";
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

// -----
// A café with US (Downtown) and CA (Toronto, Montreal), run through
// Hono with real bound members. Writes on a FAQ scoped to a Location
// or Country need the scope covered; cafe-wide FAQs and reads are open.
// -----
let db: DbConnectType;
let connectionString: string;
let tenantId: string;
let caId: string;
let downtownId: string;
let torontoId: string;
let montrealId: string;
let admin: { userId: string; partyId: string };
let toronto: { userId: string; partyId: string };
let canada: { userId: string; partyId: string };
let both: { userId: string; partyId: string };
let free: { userId: string; partyId: string };

const app = new Hono<AppEnv>();
app.onError((err, c) => {
  if (err instanceof AppError) {
    // SAFETY: AppError subclasses only use 4xx/5xx codes.
    return c.json({ data: null, error: { code: err.code, message: err.message } }, err.statusCode as 403);
  }
  throw err;
});
app.use("/faqs/*", async (c, next) => {
  c.set("userId", c.req.header("X-Test-User") ?? "");
  await next();
});
app.use("/faqs/*", requireTenantMember);
app.route("/faqs", faqRestAPI);

// SAFETY: only the connection string is read from the bindings.
const env = () => ({ HYPERDRIVE_REALTIME: { connectionString } }) as never;

type Body = { locationId?: string | null; countryId?: string | null; question?: string };
const call = (userId: string, method: string, path: string, body?: Body) =>
  app.fetch(
    new Request(`http://localhost/faqs${path}?${new URLSearchParams({ tenantId })}`, {
      method,
      headers: { "X-Test-User": userId, "Content-Type": "application/json" },
      body: body ? JSON.stringify({ categoryId: null, question: "Q?", answer: "A.", ...body }) : undefined,
    }),
    env(),
  );

const bind = async (partyId: string, scope: { locationId?: string; countryId?: string }) => {
  const [role] = await db.select({ id: partyRoles.id }).from(partyRoles).where(eq(partyRoles.partyId, partyId));
  await db.insert(partyRoleScopes).values({ tenantId, partyRoleId: role.id, ...scope });
};
const member = async (email: string, role = "store_admin") => {
  const person = await insertPersonWithLogin(db, email);
  await insertMember(db, tenantId, person.partyId, role);
  return person;
};
const seed = async (scope: { locationId?: string; countryId?: string }) => {
  const [created] = await db
    .insert(tenantFaqs)
    .values({ tenantId, question: "Seeded?", answer: "Yes.", ...scope })
    .returning({ id: tenantFaqs.id });
  return created.id;
};
const row = async (id: string) => (await db.select().from(tenantFaqs).where(eq(tenantFaqs.id, id)))[0];
const MESSAGE = "Your Role does not cover these Locations";

beforeAll(async () => {
  const created = await createTestPglite();
  db = created.db;
  const server = new PGLiteSocketServer({ db: created.pg, port: 0, maxConnections: 500 });
  await server.start();
  connectionString = `postgresql://postgres@${server.getServerConn()}/postgres`;
  tenantId = await insertTenant(db, "Maple", "maple");
  downtownId = await defaultLocationId(db, tenantId);
  caId = await insertCountry(db, tenantId, { country: "CA", currency: "CAD" });
  torontoId = await insertLocation(db, tenantId, { name: "Toronto", slug: "toronto", countryId: caId });
  montrealId = await insertLocation(db, tenantId, { name: "Montreal", slug: "montreal", countryId: caId });
  admin = await member("admin@example.com", "tenant_admin");
  toronto = await member("toronto@example.com");
  canada = await member("canada@example.com");
  both = await member("both@example.com");
  free = await member("free@example.com");
  await bind(toronto.partyId, { locationId: torontoId });
  await bind(canada.partyId, { countryId: caId });
  await bind(both.partyId, { locationId: torontoId });
});

describe("a member bound to Toronto", () => {
  it("adds, edits and deletes a FAQ for Toronto", async () => {
    const added = await call(toronto.userId, "POST", "", { locationId: torontoId });
    expect(added.status).toBe(200);
    const id: string = (await added.json()).data.id;
    expect((await call(toronto.userId, "PUT", `/${id}`, { locationId: torontoId, question: "New?" })).status).toBe(200);
    expect((await row(id)).question).toBe("New?");
    expect((await call(toronto.userId, "DELETE", `/${id}`)).status).toBe(200);
    expect(await row(id)).toBeUndefined();
  });

  it("is refused for Downtown on add, edit and delete, and nothing changes", async () => {
    const id = await seed({ locationId: downtownId });
    const responses = [
      await call(toronto.userId, "POST", "", { locationId: downtownId, question: "Nope" }),
      await call(toronto.userId, "PUT", `/${id}`, { locationId: downtownId, question: "Changed" }),
      await call(toronto.userId, "DELETE", `/${id}`),
    ];
    expect(responses.map((res) => res.status)).toEqual([403, 403, 403]);
    expect((await responses[1].json()).error.message).toBe(`${MESSAGE}: ${downtownId}`);
    expect((await responses[2].json()).error.message).toBe(`${MESSAGE}: ${downtownId}`);
    expect((await row(id)).question).toBe("Seeded?");
    expect(await db.select().from(tenantFaqs).where(eq(tenantFaqs.question, "Nope"))).toEqual([]);
  });

  it("cannot move a Downtown FAQ to Toronto: the old scope must be covered", async () => {
    const id = await seed({ locationId: downtownId });
    expect((await call(toronto.userId, "PUT", `/${id}`, { locationId: torontoId })).status).toBe(403);
    expect((await row(id)).locationId).toBe(downtownId);
  });

  it("cannot move a Toronto FAQ to Downtown: the new scope must be covered", async () => {
    const id = await seed({ locationId: torontoId });
    expect((await call(toronto.userId, "PUT", `/${id}`, { locationId: downtownId })).status).toBe(403);
    expect((await row(id)).locationId).toBe(torontoId);
  });

  it("can make a covered FAQ cafe-wide", async () => {
    const id = await seed({ locationId: torontoId });
    expect((await call(toronto.userId, "PUT", `/${id}`, {})).status).toBe(200);
    expect((await row(id)).locationId).toBeNull();
  });

  it("adds, edits and deletes cafe-wide FAQs", async () => {
    const added = await call(toronto.userId, "POST", "", {});
    expect(added.status).toBe(200);
    const id: string = (await added.json()).data.id;
    expect((await call(toronto.userId, "PUT", `/${id}`, { question: "Edited?" })).status).toBe(200);
    expect((await call(toronto.userId, "DELETE", `/${id}`)).status).toBe(200);
  });

  it("is refused a Country FAQ for a Country it only partly covers", async () => {
    const id = await seed({ countryId: caId });
    expect((await call(toronto.userId, "POST", "", { countryId: caId })).status).toBe(403);
    expect((await call(toronto.userId, "PUT", `/${id}`, { countryId: caId, question: "Changed" })).status).toBe(403);
    expect((await call(toronto.userId, "DELETE", `/${id}`)).status).toBe(403);
    expect((await row(id)).question).toBe("Seeded?");
  });

  it("still lists every FAQ", async () => {
    expect((await call(toronto.userId, "GET", "")).status).toBe(200);
  });
});

describe("a member bound to the Country Canada", () => {
  it("manages Country FAQs and either Location in it", async () => {
    const added = await call(canada.userId, "POST", "", { countryId: caId });
    expect(added.status).toBe(200);
    const id: string = (await added.json()).data.id;
    expect((await call(canada.userId, "PUT", `/${id}`, { locationId: montrealId })).status).toBe(200);
    expect((await call(canada.userId, "DELETE", `/${id}`)).status).toBe(200);
  });

  it("is refused Downtown", async () => {
    expect((await call(canada.userId, "POST", "", { locationId: downtownId })).status).toBe(403);
  });
});

describe("a member bound to every open Location of a Country one by one", () => {
  it("is allowed a Country FAQ", async () => {
    await bind(both.partyId, { locationId: montrealId });
    expect((await call(both.userId, "POST", "", { countryId: caId })).status).toBe(200);
  });

  it("covers a Country again once its other Location is archived", async () => {
    await db.update(tenantLocations).set({ archivedAt: new Date() }).where(eq(tenantLocations.id, montrealId));
    expect((await call(toronto.userId, "POST", "", { countryId: caId })).status).toBe(200);
    await db.update(tenantLocations).set({ archivedAt: null }).where(eq(tenantLocations.id, montrealId));
  });
});

describe("a bound member whose bindings are all archived", () => {
  it("covers nothing, even for a cafe-wide FAQ", async () => {
    const lonely = await member("lonely@example.com");
    const gone = await insertLocation(db, tenantId, { name: "Gone", slug: "gone" });
    await bind(lonely.partyId, { locationId: gone });
    await db.update(tenantLocations).set({ archivedAt: new Date() }).where(eq(tenantLocations.id, gone));

    expect((await call(lonely.userId, "POST", "", {})).status).toBe(403);
    expect((await call(lonely.userId, "POST", "", { locationId: downtownId })).status).toBe(403);
  });
});

describe("unbound members and the tenant admin", () => {
  it("behave as before at every scope", async () => {
    for (const userId of [free.userId, admin.userId]) {
      for (const scope of [{}, { locationId: downtownId }, { countryId: caId }]) {
        const added = await call(userId, "POST", "", scope);
        expect(added.status).toBe(200);
        const id: string = (await added.json()).data.id;
        expect((await call(userId, "PUT", `/${id}`, { locationId: torontoId })).status).toBe(200);
        expect((await call(userId, "DELETE", `/${id}`)).status).toBe(200);
      }
    }
  });
});
