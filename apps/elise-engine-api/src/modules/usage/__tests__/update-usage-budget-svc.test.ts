import { eq } from "drizzle-orm";
import { Effect } from "effect";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { accessAuditLog, tenants } from "@repo/db-elise";
import { memoryScanRepo } from "#/__tests__/memory-scan-repo";
import { openTestDb, seedTenant, type TestDb } from "#/__tests__/test-db";
import { updateUsageBudgetSvc } from "#/modules/usage/handlers";
import type { MonthSpend } from "#/modules/usage";

let test: TestDb;
let tenantId: string;

const ENV = { MONTHLY_BUDGET_USD: "20", BUDGET_ALLOWANCE_USD: "1000" };
const SPEND: MonthSpend = {
  spentUsd: 5,
  platformSpentUsd: 5,
  platformReservedUsd: 0,
  ownKey: false,
  plan: null,
  scans: 3,
  tokens: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
  budgetOverrideUsd: null,
  budgetAllowanceUsd: 100,
};

const update = (requestedUsd: number | null, spend: MonthSpend = SPEND) =>
  updateUsageBudgetSvc(ENV, test.pool, memoryScanRepo().repo, tenantId, "admin-user", requestedUsd, spend);
const budgetOf = async () => (await test.raw.select().from(tenants).where(eq(tenants.id, tenantId)))[0].monthlyScanBudgetUsd;

beforeAll(async () => {
  test = await openTestDb();
  tenantId = (await seedTenant(test, "acme")).tenantId;
});

afterAll(async () => {
  await test.close();
});

describe("updateUsageBudgetSvc", () => {
  it("saves the budget, records who changed it from what to what, and returns the new usage", async () => {
    const usage = await Effect.runPromise(update(40));

    expect(usage).toMatchObject({ budgetUsd: 40, allowanceUsd: 100, spentUsd: 5, remainingUsd: 35 });
    expect(await budgetOf()).toBe("40.00");
    const [entry] = await test.raw.select().from(accessAuditLog).where(eq(accessAuditLog.subjectId, tenantId));
    expect(entry).toMatchObject({ action: "usage.budget.updated", before: { monthlyBudgetUsd: null }, after: { tenantId, monthlyBudgetUsd: 40 } });
  });

  it.each([
    ["above the allowance", 150, SPEND, "at most $100"],
    ["below what the month has already spent", 4, SPEND, "at least $5"],
    ["a default above the allowance", null, { ...SPEND, budgetAllowanceUsd: 10 }, "at most $10"],
    ["a default below what the month has already spent", null, { ...SPEND, spentUsd: 25 }, "at least $25"],
  ])("refuses a budget %s and changes nothing", async (_name, requestedUsd, spend, message) => {
    const before = await budgetOf();

    const failure = await Effect.runPromise(Effect.flip(update(requestedUsd, spend)));

    expect(failure).toMatchObject({ _tag: "Invalid", message: expect.stringContaining(message) });
    expect(await budgetOf()).toBe(before);
  });

  it("goes back to the platform default with null", async () => {
    const usage = await Effect.runPromise(update(null, { ...SPEND, budgetOverrideUsd: 40 }));

    expect(usage.budgetUsd).toBe(20);
    expect(await budgetOf()).toBeNull();
  });
});
