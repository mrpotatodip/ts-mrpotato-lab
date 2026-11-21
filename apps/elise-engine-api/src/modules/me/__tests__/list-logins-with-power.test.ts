import { Effect } from "effect";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { authUser, ensureTenantRoles, findTenantRole, partyRoles } from "@repo/db-elise";
import { openTestDb, seedTenant, type TestDb } from "#/__tests__/test-db";
import { listLoginsWithPowerEffect } from "#/modules/me/queries";

let test: TestDb;
let tenantId: string;
let otherTenantId: string;
const partyIds: Record<string, string> = {};

const seedLogin = async (key: string, account: string, roleKey: string) => {
  const { partyId } = await seedTenant(test, `person-${key}`);
  partyIds[key] = partyId;
  const role = await findTenantRole(test.raw, account, roleKey);
  if (!role) throw new Error(`${roleKey} role missing`);
  await test.raw.insert(authUser).values({ id: key, name: `Name ${key}`, email: `${key}@example.com`, partyId });
  await test.raw.insert(partyRoles).values({ partyId, tenantId: account, roleId: role.id, roleScope: "tenant" });
};

beforeAll(async () => {
  test = await openTestDb();
  tenantId = (await seedTenant(test, "acme")).tenantId;
  otherTenantId = (await seedTenant(test, "other")).tenantId;
  await ensureTenantRoles(test.raw, tenantId);
  await ensureTenantRoles(test.raw, otherTenantId);
  await seedLogin("owner", tenantId, "tenant_admin");
  await seedLogin("admin", tenantId, "workspace_admin");
  await seedLogin("member", tenantId, "workspace_member");
  await seedLogin("elsewhere", otherTenantId, "tenant_admin");
});

afterAll(async () => {
  await test.close();
});

describe("listLoginsWithPowerEffect", () => {
  it("returns the Logins of the Account whose Role holds the Power, and no one else", async () => {
    const logins = await Effect.runPromise(listLoginsWithPowerEffect(test.http, tenantId, "company:team:invites:create"));

    expect(logins.map((login) => login.email)).toEqual(["admin@example.com", "owner@example.com"]);
    expect(logins).toContainEqual({ email: "admin@example.com", name: "Name admin", partyId: partyIds.admin });
  });
});
