import { eq } from "drizzle-orm";
import { Effect } from "effect";
import { hashInviteCode } from "@repo/db-elise";
import { authAccount, authUser, parties, partyRoles, platformInviteCodeRedemptions, platformInviteCodes, tenants } from "@repo/db-elise/schema";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { openTestDb, seedTenant, type TestDb } from "#/__tests__/test-db";
import { insertAccountEffect, pickFreeSlugEffect } from "#/modules/sign-up/queries";
import type { NewAccount } from "#/modules/sign-up/types";

let test: TestDb;
let creatorPartyId: string;

const CODE = "ABCD-EFGH-JKMN";

const account = async (overrides: Partial<NewAccount> = {}): Promise<NewAccount> => ({
  firstName: "Ada",
  lastName: "Rossi",
  email: "ada@example.com",
  passwordHash: "hash",
  accountName: "Acme Labs",
  timezone: "UTC",
  slug: "acme-labs",
  inviteCodeHash: await hashInviteCode(CODE),
  now: new Date("2026-11-07T00:00:00Z"),
  ...overrides,
});

const addCode = async (code: string, extra: Partial<typeof platformInviteCodes.$inferInsert> = {}) => {
  await test.raw.insert(platformInviteCodes).values({ codeHash: await hashInviteCode(code), createdBy: creatorPartyId, maxUses: 1, ...extra });
};

const useCount = async (code: string) =>
  (await test.raw.select().from(platformInviteCodes).where(eq(platformInviteCodes.codeHash, await hashInviteCode(code))))[0].useCount;

const count = async (table: typeof authUser | typeof tenants | typeof parties) => (await test.raw.select().from(table)).length;

beforeAll(async () => {
  test = await openTestDb();
  creatorPartyId = (await seedTenant(test, "creator")).partyId;
});

afterAll(async () => {
  await test.close();
});

describe("insertAccountEffect", () => {
  it("creates the person, login, credential, tenant, admin role and redemption in one go", async () => {
    await addCode(CODE);
    const result = await Effect.runPromise(insertAccountEffect(test.pool, await account()));

    expect(result.tenant).toMatchObject({ name: "Acme Labs", slug: "acme-labs", timezone: "UTC", role: "tenant_admin" });
    const [login] = await test.raw.select().from(authUser).where(eq(authUser.id, result.userId));
    expect(login).toMatchObject({ email: "ada@example.com", name: "Ada Rossi", emailVerified: false });
    expect((await test.raw.select().from(authAccount).where(eq(authAccount.userId, result.userId)))[0]).toMatchObject({ providerId: "credential", password: "hash" });
    const [tenant] = await test.raw.select().from(tenants).where(eq(tenants.id, result.tenant.id));
    expect(tenant.partyId).toBe(login.partyId);
    expect((await test.raw.select().from(partyRoles).where(eq(partyRoles.partyId, login.partyId)))).toHaveLength(1);
    expect((await test.raw.select().from(platformInviteCodeRedemptions)).at(-1)).toMatchObject({ personPartyId: login.partyId, tenantId: tenant.id });
    expect(await useCount(CODE)).toBe(1);
  });

  it("refuses a code that is used up, and saves nothing", async () => {
    const before = { users: await count(authUser), tenants: await count(tenants), parties: await count(parties) };
    const error = await Effect.runPromise(Effect.flip(insertAccountEffect(test.pool, await account({ email: "second@example.com", slug: "second" }))));

    expect(error).toMatchObject({ _tag: "Forbidden", message: "Invalid invite code" });
    expect({ users: await count(authUser), tenants: await count(tenants), parties: await count(parties) }).toEqual(before);
  });

  it("refuses an unknown code", async () => {
    const error = await Effect.runPromise(Effect.flip(insertAccountEffect(test.pool, await account({ inviteCodeHash: await hashInviteCode("NOPE-NOPE-NOPE") }))));

    expect(error._tag).toBe("Forbidden");
  });

  it("refuses a revoked or expired code", async () => {
    await addCode("REVO-KEDX-CODE", { revokedAt: new Date("2026-11-01T00:00:00Z") });
    await addCode("EXPI-REDX-CODE", { expiresAt: new Date("2026-11-06T00:00:00Z") });

    for (const code of ["REVO-KEDX-CODE", "EXPI-REDX-CODE"]) {
      const error = await Effect.runPromise(Effect.flip(insertAccountEffect(test.pool, await account({ inviteCodeHash: await hashInviteCode(code), email: `${code}@example.com`, slug: code.toLowerCase() }))));
      expect(error._tag).toBe("Forbidden");
    }
  });

  it("answers Conflict for a taken email and gives the code use back", async () => {
    await addCode("FREE-CODE-ONE2");
    const error = await Effect.runPromise(Effect.flip(insertAccountEffect(test.pool, await account({ inviteCodeHash: await hashInviteCode("FREE-CODE-ONE2"), slug: "another" }))));

    expect(error).toMatchObject({ _tag: "Conflict" });
    expect(await useCount("FREE-CODE-ONE2")).toBe(0);
  });

  it("tells a taken slug apart so the caller can pick another", async () => {
    await addCode("SLUG-CODE-TWO3");
    const error = await Effect.runPromise(
      Effect.flip(insertAccountEffect(test.pool, await account({ inviteCodeHash: await hashInviteCode("SLUG-CODE-TWO3"), email: "slug@example.com" }))),
    );

    expect(error._tag).toBe("SlugTaken");
    expect(await useCount("SLUG-CODE-TWO3")).toBe(0);
  });
});

describe("pickFreeSlugEffect", () => {
  it("skips a slug a tenant already has", async () => {
    expect(await Effect.runPromise(pickFreeSlugEffect(test.pool, "Acme Labs"))).toBe("acme-labs-2");
  });

  it("takes the plain name when it is free", async () => {
    expect(await Effect.runPromise(pickFreeSlugEffect(test.pool, "Brand New Co"))).toBe("brand-new-co");
  });
});
