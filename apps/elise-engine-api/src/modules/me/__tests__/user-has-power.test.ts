import { Effect } from "effect";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { authUser, ensureTenantRoles, findTenantRole, partyRoles } from "@repo/db-elise";
import type { AccessPower } from "@repo/contracts/elise";
import { openTestDb, seedTenant, type TestDb } from "#/__tests__/test-db";
import { userHasPowerEffect } from "#/modules/me/queries";

let test: TestDb;
let tenantId: string;

const ROLES = ["tenant_admin", "workspace_admin", "workspace_member", "workspace_watcher"] as const;

// -----
// One login per role in one account. The Powers come from the rows the
// migrations seed, so this also checks that the database grants what
// the roles are meant to hold.
// -----
beforeAll(async () => {
  test = await openTestDb();
  tenantId = (await seedTenant(test, "acme")).tenantId;
  await ensureTenantRoles(test.raw, tenantId);
  for (const key of ROLES) {
    const { partyId } = await seedTenant(test, `person-${key}`);
    const role = await findTenantRole(test.raw, tenantId, key);
    if (!role) throw new Error(`${key} role missing`);
    await test.raw.insert(authUser).values({ id: key, name: key, email: `${key}@example.com`, partyId });
    await test.raw.insert(partyRoles).values({ partyId, tenantId, roleId: role.id, roleScope: "tenant" });
  }
});

afterAll(async () => {
  await test.close();
});

const has = (userId: string, power: AccessPower, accountId = tenantId) => Effect.runPromise(userHasPowerEffect(test.http, userId, accountId, power));

describe("userHasPowerEffect", () => {
  it.each<[string, AccessPower, boolean]>([
    ["tenant_admin", "company:team:members:update", true],
    ["tenant_admin", "company:findings:accepted_risk:update", true],
    ["workspace_admin", "company:team:invites:create", true],
    ["workspace_admin", "company:team:invites:delete", true],
    ["workspace_admin", "company:team:groups:create", true],
    ["workspace_admin", "company:github:installations:create", true],
    ["workspace_admin", "company:github:installations:delete", true],
    ["workspace_admin", "company:findings:accepted_risk:update", true],
    ["workspace_admin", "company:team:members:update", false],
    ["workspace_admin", "company:team:members:delete", false],
    ["workspace_member", "company:team:members:read", false],
    ["workspace_member", "company:team:invites:create", false],
    ["workspace_member", "company:team:groups:read", false],
    ["workspace_member", "company:github:installations:create", false],
    ["workspace_member", "company:findings:accepted_risk:update", false],
    ["workspace_member", "company:assistant:threads:create", true],
    ["tenant_admin", "company:dashboard:read", true],
    ["workspace_admin", "company:dashboard:read", true],
    ["workspace_member", "company:dashboard:read", true],
    ["workspace_watcher", "company:dashboard:read", false],
    ["tenant_admin", "company:summary:read", true],
    ["workspace_admin", "company:summary:read", true],
    ["workspace_member", "company:summary:read", true],
    ["workspace_watcher", "company:summary:read", true],
    ["workspace_watcher", "company:team:members:read", false],
    ["workspace_watcher", "company:findings:accepted_risk:update", false],
    ["workspace_watcher", "company:assistant:threads:create", false],
  ])("%s holding %s is %s", async (userId, power, expected) => {
    expect(await has(userId, power)).toBe(expected);
  });

  it("holds nothing in another account", async () => {
    const other = (await seedTenant(test, "other")).tenantId;
    expect(await has("tenant_admin", "company:team:invites:create", other)).toBe(false);
  });
});
