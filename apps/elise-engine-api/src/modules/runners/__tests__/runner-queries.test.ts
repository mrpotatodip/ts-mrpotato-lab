import { eq } from "drizzle-orm";
import { Effect } from "effect";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { authUser, tenantRunners } from "@repo/db-elise";
import { openTestDb, seedTenant, type TestDb } from "#/__tests__/test-db";
import { claimPairingEffect, createRunnerEffect, findRunnerByTokenEffect, revokeRunnerByTokenEffect } from "#/modules/runners/queries";

let test: TestDb;
let tenantId: string;
let userId: string;

const NOW = new Date("2026-11-11T09:00:00Z");
const SOON = new Date("2026-11-11T09:10:00Z");
const LATER = new Date("2026-11-11T09:11:00Z");

const run = <A, E>(effect: Effect.Effect<A, E>) => Effect.runPromise(effect);

const addRunner = (codeHash: string, expiresAt = SOON) => run(createRunnerEffect(test.http, { tenantId, actorUserId: userId, name: "Jayson MacBook", codeHash, expiresAt }));

const claim = (codeHash: string, tokenHash: string, now = NOW) => run(claimPairingEffect(test.http, { codeHash, tokenHash, now }));

beforeAll(async () => {
  test = await openTestDb();
  const seeded = await seedTenant(test, "acme");
  tenantId = seeded.tenantId;
  userId = crypto.randomUUID();
  await test.raw.insert(authUser).values({ id: userId, name: "Ada", email: "ada@example.com", emailVerified: true, partyId: seeded.partyId });
});

afterAll(async () => {
  await test.close();
});

describe("pairing a Runner", () => {
  it("trades a code for an identity, once", async () => {
    await addRunner("code-once");
    const first = await claim("code-once", "token-once");
    const second = await claim("code-once", "token-twice");
    expect(first).toMatchObject({ name: "Jayson MacBook", accountId: tenantId, accountName: "acme" });
    expect(second).toBeNull();
  });

  it("refuses a code that has expired", async () => {
    await addRunner("code-late");
    expect(await claim("code-late", "token-late", LATER)).toBeNull();
  });

  it("refuses a code that was never made", async () => {
    expect(await claim("code-unknown", "token-unknown")).toBeNull();
  });

  it("refuses a code whose Runner was revoked", async () => {
    await addRunner("code-revoked");
    await test.raw.update(tenantRunners).set({ revokedAt: NOW }).where(eq(tenantRunners.pairingCodeHash, "code-revoked"));
    expect(await claim("code-revoked", "token-revoked")).toBeNull();
  });

  it("keeps no code on the row once paired", async () => {
    await addRunner("code-cleared");
    await claim("code-cleared", "token-cleared");
    const [row] = await test.raw.select().from(tenantRunners).where(eq(tenantRunners.tokenHash, "token-cleared"));
    expect(row).toMatchObject({ pairingCodeHash: null, pairingExpiresAt: null });
    expect(row?.pairedAt).toEqual(NOW);
  });
});

describe("a paired Runner", () => {
  it("is found by its token and marked as seen", async () => {
    await addRunner("code-seen");
    await claim("code-seen", "token-seen");
    const found = await run(findRunnerByTokenEffect(test.http, "token-seen", LATER));
    const [row] = await test.raw.select().from(tenantRunners).where(eq(tenantRunners.tokenHash, "token-seen"));
    expect(found?.accountId).toBe(tenantId);
    expect(row?.lastSeenAt).toEqual(LATER);
  });

  it("is not found once revoked", async () => {
    await addRunner("code-gone");
    await claim("code-gone", "token-gone");
    await test.raw.update(tenantRunners).set({ revokedAt: NOW }).where(eq(tenantRunners.tokenHash, "token-gone"));
    expect(await run(findRunnerByTokenEffect(test.http, "token-gone", LATER))).toBeNull();
  });

  it("is not found by a token nobody holds", async () => {
    expect(await run(findRunnerByTokenEffect(test.http, "token-nobody", LATER))).toBeNull();
  });

  it("disconnects itself once, and then its token finds nothing", async () => {
    await addRunner("code-bye");
    await claim("code-bye", "token-bye");
    const first = await run(revokeRunnerByTokenEffect(test.http, "token-bye", LATER));
    const second = await run(revokeRunnerByTokenEffect(test.http, "token-bye", LATER));
    expect({ first, second }).toEqual({ first: true, second: false });
    expect(await run(findRunnerByTokenEffect(test.http, "token-bye", LATER))).toBeNull();
  });
});
