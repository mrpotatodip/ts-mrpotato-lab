import { Effect } from "effect";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { authUser } from "@repo/db-elise";
import { openTestDb, seedTenant, type TestDb } from "#/__tests__/test-db";
import { USAGE_BUDGET_CHANGES_LIMIT } from "#/modules/usage/constants";
import { budgetChangesEffect, setMonthlyBudgetEffect } from "#/modules/usage/queries";

let test: TestDb;
let tenantId: string;
let otherTenantId: string;

const set = (tenant: string, userId: string, budgetUsd: number | null) => Effect.runPromise(setMonthlyBudgetEffect(test.pool, tenant, userId, budgetUsd));
const changes = (tenant: string) => Effect.runPromise(budgetChangesEffect(test.http, tenant));

beforeAll(async () => {
  test = await openTestDb();
  const acme = await seedTenant(test, "acme");
  tenantId = acme.tenantId;
  otherTenantId = (await seedTenant(test, "other")).tenantId;
  await test.raw.insert(authUser).values({ id: "ada", name: "Ada Rossi", email: "ada@example.com", partyId: acme.partyId });
});

afterAll(async () => {
  await test.close();
});

describe("budgetChangesEffect", () => {
  it("lists the changes newest first, with who made each and from what to what", async () => {
    await set(tenantId, "ada", 30);
    await set(tenantId, "ada", 45);
    await set(tenantId, "ada", null);

    const list = await changes(tenantId);

    expect(list.map(({ by, fromUsd, toUsd }) => ({ by, fromUsd, toUsd }))).toEqual([
      { by: "Ada Rossi", fromUsd: 45, toUsd: null },
      { by: "Ada Rossi", fromUsd: 30, toUsd: 45 },
      { by: "Ada Rossi", fromUsd: null, toUsd: 30 },
    ]);
  });

  it("leaves out the changes of another account", async () => {
    await set(otherTenantId, "ada", 99);

    expect(await changes(tenantId)).toHaveLength(3);
    expect(await changes(otherTenantId)).toHaveLength(1);
  });

  it("names nobody when the login behind a change is gone", async () => {
    await set(otherTenantId, "gone", 50);

    const [latest] = await changes(otherTenantId);

    expect(latest).toMatchObject({ by: null, toUsd: 50 });
  });

  it("stops at the limit", async () => {
    for (let i = 0; i < USAGE_BUDGET_CHANGES_LIMIT + 2; i++) await set(tenantId, "ada", i);

    expect(await changes(tenantId)).toHaveLength(USAGE_BUDGET_CHANGES_LIMIT);
  });
});
