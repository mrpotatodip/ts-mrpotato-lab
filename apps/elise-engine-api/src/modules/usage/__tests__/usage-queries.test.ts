import { Effect } from "effect";
import { eq } from "drizzle-orm";
import { scans, tenants } from "@repo/db-elise/schema";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { openTestDb, scanValues, seedRepo, seedTenant, type TestDb } from "#/__tests__/test-db";
import { monthSpendEffect } from "#/modules/usage";

let test: TestDb;
let tenantId: string;
let repoId: string;

const row = (id: string, createdAt: string, costUsd: string | null, tokens: number | null) =>
  scanValues(tenantId, repoId, id, createdAt, {
    costUsd,
    inputTokens: tokens,
    outputTokens: tokens,
    cacheReadTokens: tokens,
    cacheWriteTokens: tokens,
  });

beforeAll(async () => {
  test = await openTestDb();
  tenantId = (await seedTenant(test)).tenantId;
  repoId = await seedRepo(test, tenantId);
  await test.raw.insert(scans).values([
    row("in-1", "2026-11-03T10:00:00Z", "0.5000", 100),
    row("in-2", "2026-11-20T10:00:00Z", "0.2500", 50),
    row("in-no-usage", "2026-11-21T10:00:00Z", null, null),
    row("last-month", "2026-10-31T23:59:59Z", "9.0000", 9000),
  ]);
});

afterAll(async () => {
  await test.close();
});

describe("monthSpendEffect", () => {
  it("adds the cost and tokens of the scans created this month", async () => {
    const spend = await Effect.runPromise(monthSpendEffect(test.http, tenantId, new Date("2026-11-01T00:00:00Z")));

    expect(spend).toEqual({
      spentUsd: 0.75,
      scans: 3,
      tokens: { input: 150, output: 150, cacheRead: 150, cacheWrite: 150 },
      budgetOverrideUsd: null,
      budgetAllowanceUsd: null,
    });
  });

  it("leaves out scans from an earlier month", async () => {
    const spend = await Effect.runPromise(monthSpendEffect(test.http, tenantId, new Date("2026-10-01T00:00:00Z")));

    expect(spend.spentUsd).toBe(9.75);
  });

  it("reads the account's own budget", async () => {
    await test.raw.update(tenants).set({ monthlyScanBudgetUsd: "50.00" }).where(eq(tenants.id, tenantId));
    const spend = await Effect.runPromise(monthSpendEffect(test.http, tenantId, new Date("2026-11-01T00:00:00Z")));

    expect(spend.budgetOverrideUsd).toBe(50);
  });

  it("is zero for an account with no scans", async () => {
    const empty = (await seedTenant(test, "empty")).tenantId;
    const spend = await Effect.runPromise(monthSpendEffect(test.http, empty, new Date("2026-11-01T00:00:00Z")));

    expect(spend).toMatchObject({ spentUsd: 0, scans: 0, tokens: { input: 0 } });
  });
});
