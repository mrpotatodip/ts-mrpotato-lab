import { Effect } from "effect";
import { eq } from "drizzle-orm";
import { platformMasterPlans, scans, tenantAnthropicKeys, tenantSubscriptions } from "@repo/db-elise/schema";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { openTestDb, scanValues, seedRepo, seedTenant, type TestDb } from "#/__tests__/test-db";
import { monthSpendEffect } from "#/modules/usage";

let test: TestDb;
let tenantId: string;
let partyId: string;
let repoId: string;

const MONTH = new Date("2026-11-01T00:00:00Z");
const spend = () => Effect.runPromise(monthSpendEffect(test.http, tenantId, MONTH));

beforeAll(async () => {
  test = await openTestDb();
  const seeded = await seedTenant(test, "acme");
  tenantId = seeded.tenantId;
  partyId = seeded.partyId;
  repoId = await seedRepo(test, tenantId);
  const otherRepoId = await seedRepo(test, tenantId, "https://github.com/octocat/Spoon-Knife");
  await test.raw.insert(scans).values([
    scanValues(tenantId, repoId, "platform-done", "2026-11-03T10:00:00Z", { costUsd: "1.0000", keySource: "platform" }),
    scanValues(tenantId, repoId, "own-key-done", "2026-11-04T10:00:00Z", { costUsd: "4.0000", keySource: "account" }),
    scanValues(tenantId, repoId, "platform-running", "2026-11-05T10:00:00Z", { status: "running", maxBudgetUsd: "2.00", keySource: "platform" }),
    scanValues(tenantId, otherRepoId, "own-key-running", "2026-11-05T11:00:00Z", { status: "running", maxBudgetUsd: "1.50", keySource: "account" }),
  ]);
});

afterAll(async () => {
  await test.close();
});

describe("monthSpendEffect and the platform's key", () => {
  it("counts every scan in the spend, and only the platform's key in the platform part", async () => {
    const result = await spend();

    expect(result).toMatchObject({ spentUsd: 5, platformSpentUsd: 1 });
  });

  it("holds the cap of running scans on the platform's key only", async () => {
    const result = await spend();

    expect(result.platformReservedUsd).toBe(2);
  });

  it("knows when the account has its own key", async () => {
    expect((await spend()).ownKey).toBe(false);

    await test.raw.insert(tenantAnthropicKeys).values({ tenantId, sealedKey: "sealed", lastFour: "abcd", updatedBy: partyId });

    expect((await spend()).ownKey).toBe(true);
  });

  it("reads the plan the account is on", async () => {
    expect((await spend()).plan).toBeNull();
    const [team] = await test.raw.select().from(platformMasterPlans).where(eq(platformMasterPlans.key, "team"));
    await test.raw.insert(tenantSubscriptions).values({ tenantId, planId: team.id, status: "active", source: "grant" });

    expect((await spend()).plan).toMatchObject({ planKey: "team", includedCreditUsd: 50, maxMembers: 10, status: "active", pastDueSince: null });
  });
});
