import { beforeEach, describe, expect, it } from "vitest";
import { count, eq, sql } from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";
import { Effect } from "effect";
import {
  authAccount,
  authUser,
  inviteCodeRedemptions,
  inviteCodes,
  organizations,
  parties,
  persons,
  tenantBusinessHours,
  tenantCountries,
  tenantFaqs,
  partyRoles,
  roles,
  tenantLocations,
  tenantMenuCategories,
  tenants,
} from "@repo/db-amelie";
import { SignUpBodySchema, type SignUpBody } from "@repo/contracts/amelie";
import app from "#/index";
import { buildAuth } from "#/lib/auth";
import type { DbConnectType } from "#/lib/db-connection";
import { ConflictError, ForbiddenError } from "#/lib/errors";
import { runEffect } from "#/lib/effect-query";
import { createAccountSvc } from "#/modules/sign-up/handlers";
import { insertAccountEffect } from "#/modules/sign-up/queries";
import { slugCandidates, slugify } from "#/modules/sign-up/lib";
import { hashInviteCode } from "#/modules/invite-code";
import { createInviteCodeSvc, revokeInviteCodeSvc } from "#/modules/invite-code/handlers";
import { createTestDb, insertPersonWithLogin } from "#/__tests__/amelie-test-db";

const body = (overrides: Partial<SignUpBody> = {}): SignUpBody => ({
  inviteCode: invite,
  firstName: "Ada",
  lastName: "Rossi",
  email: "ada@sorella.test",
  password: "correct-horse-battery",
  cafeName: "Sorella Cafe",
  timezone: "Europe/Rome",
  country: "IT",
  currency: "EUR",
  ...overrides,
});

const signUp = (db: DbConnectType, overrides: Partial<SignUpBody> = {}) =>
  runEffect(createAccountSvc(db, body(overrides)));

const makeCode = async (maxUses = 1) => {
  const created = await runEffect(createInviteCodeSvc(db, boss.userId, { note: "", maxUses, expiresAt: null }));
  return { code: created.code, id: created.inviteCode.id };
};

const useCountOf = async (id: string) =>
  (await db.select().from(inviteCodes).where(eq(inviteCodes.id, id)))[0].useCount;

const rowCount = async (db: DbConnectType, table: PgTable) =>
  (await db.select({ n: count() }).from(table))[0].n;

// -----
// Counts of what sign-up creates, minus what the
// setup (the admin who makes codes) already added.
// -----
let baseline: Record<string, number>;

const rawCounts = async (db: DbConnectType) => ({
  parties: await rowCount(db, parties),
  persons: await rowCount(db, persons),
  organizations: await rowCount(db, organizations),
  users: await rowCount(db, authUser),
  accounts: await rowCount(db, authAccount),
  tenants: await rowCount(db, tenants),
  roles: await rowCount(db, roles),
  partyRoles: await rowCount(db, partyRoles),
  redemptions: await rowCount(db, inviteCodeRedemptions),
  locations: await rowCount(db, tenantLocations),
  countries: await rowCount(db, tenantCountries),
});

const rowCounts = async (db: DbConnectType) => {
  const raw = await rawCounts(db);
  return Object.fromEntries(Object.entries(raw).map(([key, n]) => [key, n - baseline[key]]));
};

let db: DbConnectType;
let boss: { userId: string; partyId: string };
let invite: string;

const NOTHING = {
  parties: 0,
  persons: 0,
  organizations: 0,
  users: 0,
  accounts: 0,
  tenants: 0,
  roles: 0,
  partyRoles: 0,
  redemptions: 0,
  locations: 0,
  countries: 0,
};

beforeEach(async () => {
  db = await createTestDb();
  boss = await insertPersonWithLogin(db, "boss@amelie.test");
  invite = (await makeCode(1000)).code;
  baseline = await rawCounts(db);
});

describe("sign-up", () => {
  it("creates one Person, login, Organization, Tenant, its three Roles and an owner Party role, and an empty cafe", async () => {
    const result = await signUp(db, { website: "https://sorellacafe.com/menu?x=1" });

    expect(await rowCounts(db)).toEqual({
      parties: 2,
      persons: 1,
      organizations: 1,
      users: 1,
      accounts: 1,
      tenants: 1,
      roles: 3,
      partyRoles: 1,
      redemptions: 1,
      locations: 1,
      countries: 1,
    });
    expect(result.tenant).toEqual({
      id: expect.any(String),
      name: "Sorella Cafe",
      slug: "sorella-cafe",
      timezone: "Europe/Rome",
      country: "IT",
      currency: "EUR",
      allowedOrigins: ["https://sorellacafe.com"],
      role: "owner",
      canEdit: true,
    });
    const [partyRole] = await db.select().from(partyRoles);
    const [user] = await db.select().from(authUser).where(eq(authUser.id, result.userId));
    expect(partyRole).toMatchObject({ tenantId: result.tenant.id, roleKey: "owner", partyId: user.partyId });
    const tenantRoles = await db.select().from(roles);
    expect(tenantRoles.map((r) => [r.key, r.canEdit, r.tenantId]).toSorted()).toEqual([
      ["manager", true, result.tenant.id],
      ["owner", true, result.tenant.id],
      ["staff", false, result.tenant.id],
    ]);
    expect(partyRole.roleId).toBe(tenantRoles.find((r) => r.key === "owner")?.id);
    expect(user).toMatchObject({ id: result.userId, email: "ada@sorella.test", emailVerified: false });
    const [person] = await db.select().from(persons).where(eq(persons.partyId, user.partyId));
    expect(person).toMatchObject({ firstName: "Ada", lastName: "Rossi" });

    for (const table of [tenantMenuCategories, tenantBusinessHours, tenantFaqs]) {
      expect((await db.select({ n: count() }).from(table))[0].n).toBe(0);
    }
  });

  it("creates the Tenant's default Location from the cafe name, slug and timezone", async () => {
    const result = await signUp(db, { cafeName: "Sorella Cafe", timezone: "Europe/Rome" });

    const locations = await db.select().from(tenantLocations);
    expect(locations).toHaveLength(1);
    expect(locations[0]).toMatchObject({
      tenantId: result.tenant.id,
      name: "Sorella Cafe",
      slug: "sorella-cafe",
      timezone: "Europe/Rome",
      address: null,
      phone: null,
      archivedAt: null,
    });
  });

  it("leaves no allowed origin when no website is given", async () => {
    const result = await signUp(db);

    expect(result.tenant.allowedOrigins).toEqual([]);
  });

  it("rejects an unknown invite code with one generic error and creates nothing", async () => {
    const wrong = signUp(db, { inviteCode: "guess" });

    await expect(wrong).rejects.toBeInstanceOf(ForbiddenError);
    await expect(wrong).rejects.toMatchObject({ message: "Invalid invite code" });
    expect(await rowCounts(db)).toEqual(NOTHING);
  });

  it("rejects a duplicate email with a clear message and creates nothing more", async () => {
    await signUp(db);
    const before = await rowCounts(db);

    const again = signUp(db, { cafeName: "Another Cafe" });

    await expect(again).rejects.toBeInstanceOf(ConflictError);
    await expect(again).rejects.toMatchObject({ message: "An account with this email already exists" });
    expect(await rowCounts(db)).toEqual(before);
  });

  it("checks the invite code before saying an email has an account", async () => {
    await signUp(db);

    const wrong = signUp(db, { inviteCode: "guess" });

    await expect(wrong).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("treats a duplicate email that slips past the pre-check as a conflict", async () => {
    // -----
    // Two sign-ups racing: the unique index on the
    // email is what stops the second insert.
    // -----
    await signUp(db);
    const before = await rowCounts(db);

    const raced = runEffect(
      insertAccountEffect(db, {
        firstName: "Eve",
        lastName: "Twin",
        email: "ada@sorella.test",
        passwordHash: "x",
        cafeName: "Twin Cafe",
        timezone: "Europe/Rome",
        country: "US",
        currency: "USD",
        slug: "twin-cafe",
        allowedOrigins: [],
        inviteCodeHash: await hashInviteCode(invite),
        now: new Date(),
      }).pipe(Effect.catchTag("SlugTaken", (e) => Effect.die(e))),
    );

    await expect(raced).rejects.toBeInstanceOf(ConflictError);
    expect(await rowCounts(db)).toEqual(before);
  });

  it("lowercases the email, as the sign-in does", () => {
    expect(SignUpBodySchema.parse(body({ email: "ADA@Sorella.test" })).email).toBe("ada@sorella.test");
  });
});

describe("slugs", () => {
  it("suffixes a clashing slug with -2, -3", async () => {
    const first = await signUp(db, { email: "a@test.test" });
    const second = await signUp(db, { email: "b@test.test" });
    const third = await signUp(db, { email: "c@test.test" });

    expect([first, second, third].map((r) => r.tenant.slug)).toEqual([
      "sorella-cafe",
      "sorella-cafe-2",
      "sorella-cafe-3",
    ]);
  });

  it.each(["api", "admin", "www", "auth", "Admin"])("never uses the reserved word %s", async (name) => {
    const result = await signUp(db, { cafeName: name });

    expect(result.tenant.slug).not.toBe(name.toLowerCase());
    expect(result.tenant.slug).toBe(`${name.toLowerCase()}-2`);
  });

  it("retries when a concurrent sign-up takes the slug between the pick and the insert", async () => {
    // -----
    // The trigger throws the slug's unique violation
    // on the first two inserts, as a lost race would.
    // A sequence survives the rollback that the error causes.
    // -----
    await db.execute(sql`create sequence collisions`);
    await db.execute(sql`
      create function collide() returns trigger language plpgsql as $$
      begin
        if nextval('collisions') <= 2 then
          raise exception 'slug taken' using errcode = '23505', constraint = 'uq_tenants_slug';
        end if;
        return new;
      end $$`);
    await db.execute(sql`create trigger collide_before before insert on tenants for each row execute function collide()`);

    const result = await signUp(db);

    expect(result.tenant.slug).toBe("sorella-cafe");
    expect((await rowCounts(db)).tenants).toBe(1);
    expect((await rowCounts(db)).users).toBe(1);
  });

  it("gives up after 5 collisions and leaves no rows behind", async () => {
    await db.execute(sql`
      create function always_collide() returns trigger language plpgsql as $$
      begin
        raise exception 'slug taken' using errcode = '23505', constraint = 'uq_tenants_slug';
      end $$`);
    await db.execute(
      sql`create trigger collide_before before insert on tenants for each row execute function always_collide()`,
    );

    await expect(signUp(db)).rejects.toBeInstanceOf(ConflictError);
    expect(await rowCounts(db)).toEqual(NOTHING);
  });

  it("makes the slug from the name: lowercase, hyphens, no accents, 40 characters", () => {
    expect(slugify("Café Crème & Co.")).toBe("cafe-creme-co");
    expect(slugify("  --Hello   World--  ")).toBe("hello-world");
    expect(slugify("a".repeat(60))).toHaveLength(40);
    expect(slugify("☕☕")).toBe("cafe");
    expect(slugCandidates("a".repeat(60), 3).every((slug) => slug.length <= 40)).toBe(true);
    expect(slugCandidates("Sorella", 3)).toEqual(["sorella", "sorella-2", "sorella-3"]);
  });
});

describe("atomicity", () => {
  it("leaves no rows behind when a step fails partway", async () => {
    // -----
    // The owner Party role is the last insert; a
    // failure there must undo everything before it.
    // -----
    await db.execute(sql`
      create function fail_member() returns trigger language plpgsql as $$
      begin
        raise exception 'boom';
      end $$`);
    await db.execute(
      sql`create trigger fail_before before insert on party_roles for each row execute function fail_member()`,
    );

    await expect(signUp(db)).rejects.toThrow("Database error");
    expect(await rowCounts(db)).toEqual(NOTHING);
  });
});

describe("country and currency", () => {
  it("creates a Manila business as PH / PHP", async () => {
    const result = await signUp(db, { timezone: "Asia/Manila", country: "PH", currency: "PHP" });

    expect(result.tenant).toMatchObject({ country: "PH", currency: "PHP" });
    const [row] = await db.select().from(tenantCountries).where(eq(tenantCountries.tenantId, result.tenant.id));
    expect(row).toMatchObject({ country: "PH", currency: "PHP" });
  });

  it("creates the first Country from the picked country and currency, and puts the Location in it", async () => {
    const result = await signUp(db, { country: "PH", currency: "PHP" });

    const countries = await db.select().from(tenantCountries).where(eq(tenantCountries.tenantId, result.tenant.id));
    expect(countries).toHaveLength(1);
    expect(countries[0]).toMatchObject({ country: "PH", currency: "PHP", archivedAt: null });
    const locations = await db.select().from(tenantLocations).where(eq(tenantLocations.tenantId, result.tenant.id));
    expect(locations).toHaveLength(1);
    expect(locations[0].countryId).toBe(countries[0].id);
  });

  it("keeps a currency that differs from the country's own", async () => {
    const result = await signUp(db, { country: "KH", currency: "USD" });

    expect(result.tenant).toMatchObject({ country: "KH", currency: "USD" });
  });

  it("requires both fields", () => {
    const { country: _c, ...noCountry } = body();
    const { currency: _u, ...noCurrency } = body();

    expect(SignUpBodySchema.safeParse(noCountry).success).toBe(false);
    expect(SignUpBodySchema.safeParse(noCurrency).success).toBe(false);
  });

  it("rejects values outside the shared lists", () => {
    expect(SignUpBodySchema.safeParse({ ...body(), country: "ZZ" }).success).toBe(false);
    expect(SignUpBodySchema.safeParse({ ...body(), currency: "XXX" }).success).toBe(false);
    expect(SignUpBodySchema.safeParse({ ...body(), country: "" }).success).toBe(false);
  });

  it("answers 400 in the envelope for an unknown country over HTTP", async () => {
    const res = await app.fetch(
      new Request("http://localhost/public/sign-up", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...body(), country: "ZZ" }),
      }),
      // SAFETY: validation fails before any binding is read.
      {} as never,
    );

    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ data: null, error: { code: "VALIDATION_ERROR" } });
  });
});

describe("timezone and body", () => {
  it("rejects a timezone that is not an IANA zone", () => {
    const parsed = SignUpBodySchema.safeParse(body({ timezone: "Mars/Olympus_Mons" }));

    expect(parsed.success).toBe(false);
  });

  it("accepts a real timezone", () => {
    expect(SignUpBodySchema.safeParse(body({ timezone: "America/New_York" })).success).toBe(true);
  });

  it("answers 400 in the envelope for a bad timezone over HTTP", async () => {
    const res = await app.fetch(
      new Request("http://localhost/public/sign-up", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body({ timezone: "Nowhere/Land" })),
      }),
      // SAFETY: validation fails before any binding is read.
      {} as never,
    );

    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ data: null, error: { code: "VALIDATION_ERROR" } });
  });

  it("rejects a short password and a website that is not http(s)", () => {
    expect(SignUpBodySchema.safeParse(body({ password: "short" })).success).toBe(false);
    expect(SignUpBodySchema.safeParse(body({ website: "ftp://sorella.test" })).success).toBe(false);
  });
});

describe("sign-in after sign-up", () => {
  it("lets the new login sign in with its email and password", async () => {
    await signUp(db);
    const auth = buildAuth({
      db,
      secret: "test-secret-test-secret-test-secret",
      baseUrl: "http://localhost:8788",
      trustedOrigins: ["http://localhost:3000"],
    });

    const session = await auth.api.signInEmail({
      body: { email: "ada@sorella.test", password: "correct-horse-battery" },
    });

    expect(session.token).toEqual(expect.any(String));
    const [user] = await db.select().from(authUser).where(eq(authUser.email, "ada@sorella.test"));
    expect(session.user.id).toBe(user.id);
  });

  it("refuses a wrong password", async () => {
    await signUp(db);
    const auth = buildAuth({
      db,
      secret: "test-secret-test-secret-test-secret",
      baseUrl: "http://localhost:8788",
      trustedOrigins: ["http://localhost:3000"],
    });

    await expect(
      auth.api.signInEmail({ body: { email: "ada@sorella.test", password: "wrong-password-1" } }),
    ).rejects.toThrow("Invalid email or password");
  });
});

describe("invite codes", () => {
  it("starts a cafe with a code made by the invite-code module and records who used it", async () => {
    const { code, id } = await makeCode();

    const result = await signUp(db, { inviteCode: code });

    const [redemption] = await db.select().from(inviteCodeRedemptions);
    const [user] = await db.select().from(authUser).where(eq(authUser.email, "ada@sorella.test"));
    expect(redemption).toMatchObject({ inviteCodeId: id, personPartyId: user.partyId, tenantId: result.tenant.id });
    expect(redemption.redeemedAt).toBeInstanceOf(Date);
    expect(await useCountOf(id)).toBe(1);
  });

  it.each([
    ["lowercase", (code: string) => code.toLowerCase()],
    ["without dashes", (code: string) => code.replaceAll("-", "")],
    ["with spaces", (code: string) => ` ${code.replaceAll("-", " ")} `],
  ])("accepts a code typed %s", async (_label, retype) => {
    const { code } = await makeCode();

    await expect(signUp(db, { inviteCode: retype(code) })).resolves.toBeDefined();
  });

  it("refuses a revoked code", async () => {
    const { code, id } = await makeCode();
    await runEffect(revokeInviteCodeSvc(db, id));

    await expect(signUp(db, { inviteCode: code })).rejects.toMatchObject({ message: "Invalid invite code" });
    expect(await rowCounts(db)).toEqual(NOTHING);
    expect(await useCountOf(id)).toBe(0);
  });

  it("refuses an expired code", async () => {
    const { code, id } = await makeCode();
    await db.update(inviteCodes).set({ expiresAt: new Date(Date.UTC(2020, 0, 1)) }).where(eq(inviteCodes.id, id));

    const refused = signUp(db, { inviteCode: code });

    await expect(refused).rejects.toBeInstanceOf(ForbiddenError);
    await expect(refused).rejects.toMatchObject({ message: "Invalid invite code" });
    expect(await rowCounts(db)).toEqual(NOTHING);
  });

  it("refuses a used-up code with the same error", async () => {
    const { code, id } = await makeCode();
    await signUp(db, { inviteCode: code });
    const before = await rowCounts(db);

    const again = signUp(db, { inviteCode: code, email: "eve@sorella.test", cafeName: "Eve Cafe" });

    await expect(again).rejects.toBeInstanceOf(ForbiddenError);
    await expect(again).rejects.toMatchObject({ message: "Invalid invite code" });
    expect(await rowCounts(db)).toEqual(before);
    expect(await useCountOf(id)).toBe(1);
  });

  it("admits a multi-use code up to its limit and refuses the next", async () => {
    const { code, id } = await makeCode(2);

    await signUp(db, { inviteCode: code, email: "a@test.test" });
    await signUp(db, { inviteCode: code, email: "b@test.test" });
    const third = signUp(db, { inviteCode: code, email: "c@test.test" });

    await expect(third).rejects.toBeInstanceOf(ForbiddenError);
    expect(await useCountOf(id)).toBe(2);
    expect((await rowCounts(db)).tenants).toBe(2);
    expect((await rowCounts(db)).redemptions).toBe(2);
  });

  it("lets exactly one of two simultaneous sign-ups use a single-use code", async () => {
    const { code, id } = await makeCode();

    const results = await Promise.allSettled([
      signUp(db, { inviteCode: code, email: "a@test.test", cafeName: "Cafe A" }),
      signUp(db, { inviteCode: code, email: "b@test.test", cafeName: "Cafe B" }),
    ]);

    expect(results.map((r) => r.status).toSorted()).toEqual(["fulfilled", "rejected"]);
    const refused = results.find((r) => r.status === "rejected");
    expect(refused?.reason).toBeInstanceOf(ForbiddenError);
    expect(refused?.reason).toMatchObject({ message: "Invalid invite code" });
    expect((await rowCounts(db)).tenants).toBe(1);
    expect(await useCountOf(id)).toBe(1);
  });

  it("gives the use back when a later step fails", async () => {
    const { code, id } = await makeCode();
    await db.execute(sql`
      create function fail_member() returns trigger language plpgsql as $$
      begin
        raise exception 'boom';
      end $$`);
    await db.execute(
      sql`create trigger fail_before before insert on party_roles for each row execute function fail_member()`,
    );

    await expect(signUp(db, { inviteCode: code })).rejects.toThrow("Database error");

    expect(await useCountOf(id)).toBe(0);
    expect(await rowCounts(db)).toEqual(NOTHING);
  });

  it("gives the use back when the email is taken", async () => {
    await signUp(db);
    const { code, id } = await makeCode();

    await expect(signUp(db, { inviteCode: code, cafeName: "Other Cafe" })).rejects.toBeInstanceOf(ConflictError);

    expect(await useCountOf(id)).toBe(0);
  });
});
