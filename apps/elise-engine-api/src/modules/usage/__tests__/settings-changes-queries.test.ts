import { Effect } from "effect";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { authUser } from "@repo/db-elise";
import { openTestDb, seedTenant, type TestDb } from "#/__tests__/test-db";
import { removeAnthropicKeyEffect, saveAnthropicKeyEffect } from "#/modules/anthropic-key/queries";
import { USAGE_SETTINGS_CHANGES_LIMIT } from "#/modules/usage/constants";
import { setMonthlyBudgetEffect, settingsChangesEffect } from "#/modules/usage/queries";

let test: TestDb;
let tenantId: string;
let otherTenantId: string;

const changes = (tenant: string) => Effect.runPromise(settingsChangesEffect(test.http, tenant));

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

describe("settingsChangesEffect", () => {
  it("lists budget and key changes together, newest first, without the key", async () => {
    await Effect.runPromise(setMonthlyBudgetEffect(test.pool, tenantId, "ada", 30));
    await Effect.runPromise(saveAnthropicKeyEffect(test.pool, tenantId, "ada", "iv.sealed-text", "w3Zq"));
    await Effect.runPromise(removeAnthropicKeyEffect(test.pool, tenantId, "ada"));

    const list = await changes(tenantId);

    expect(list).toMatchObject([
      { kind: "anthropic_key_removed", by: "Ada Rossi", lastFour: "w3Zq" },
      { kind: "anthropic_key_set", by: "Ada Rossi", lastFour: "w3Zq" },
      { kind: "budget", by: "Ada Rossi", fromUsd: null, toUsd: 30 },
    ]);
    expect(JSON.stringify(list)).not.toContain("sealed-text");
  });

  it("leaves out the changes of another account", async () => {
    await Effect.runPromise(setMonthlyBudgetEffect(test.pool, otherTenantId, "ada", 99));

    expect(await changes(tenantId)).toHaveLength(3);
    expect(await changes(otherTenantId)).toHaveLength(1);
  });

  it("stops at the limit", async () => {
    for (let i = 0; i < USAGE_SETTINGS_CHANGES_LIMIT + 2; i++) await Effect.runPromise(setMonthlyBudgetEffect(test.pool, tenantId, "ada", i));

    expect(await changes(tenantId)).toHaveLength(USAGE_SETTINGS_CHANGES_LIMIT);
  });
});
