import { eq } from "drizzle-orm";
import { Effect } from "effect";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { authUser, ensureTenantRoles, findTenantRole, partyRoles, platformMasterPlans, tenantSubscriptions } from "@repo/db-elise";
import { TENANT_ADMIN_ROLE_KEY } from "@repo/contracts/elise";
import { openTestDb, seedTenant, type TestDb } from "#/__tests__/test-db";
import { createInviteEffect } from "#/modules/team/queries";
import type { NewInvite } from "#/modules/team/types";

let test: TestDb;

const NOW = new Date("2026-11-08T00:00:00Z");

type Account = { tenantId: string; userId: string };

const account = async (slug: string, planKey: string | null): Promise<Account> => {
  const seeded = await seedTenant(test, slug);
  await ensureTenantRoles(test.raw, seeded.tenantId);
  const role = await findTenantRole(test.raw, seeded.tenantId, TENANT_ADMIN_ROLE_KEY);
  if (!role) throw new Error("tenant_admin role missing");
  const userId = `${slug}-admin`;
  await test.raw.insert(authUser).values({ id: userId, name: "Ada Rossi", email: `${slug}@example.com`, partyId: seeded.partyId });
  await test.raw.insert(partyRoles).values({ partyId: seeded.partyId, tenantId: seeded.tenantId, roleId: role.id, roleScope: "tenant" });
  if (planKey) {
    const [plan] = await test.raw.select().from(platformMasterPlans).where(eq(platformMasterPlans.key, planKey));
    await test.raw.insert(tenantSubscriptions).values({ tenantId: seeded.tenantId, planId: plan.id, status: "active", source: "grant" });
  }
  return { tenantId: seeded.tenantId, userId };
};

const invite = (from: Account, email: string): NewInvite => ({
  tenantId: from.tenantId,
  actorUserId: from.userId,
  email,
  roleKey: "workspace_member",
  groupIds: [],
  tokenHash: crypto.randomUUID(),
  now: NOW,
  expiresAt: new Date("2026-11-15T00:00:00Z"),
});

const attempt = (from: Account, email: string) =>
  Effect.runPromise(
    createInviteEffect(test.pool, invite(from, email)).pipe(Effect.match({ onSuccess: () => "invited", onFailure: (failure) => failure.message })),
  );

beforeAll(async () => {
  test = await openTestDb();
  await test.raw.update(platformMasterPlans).set({ maxMembers: 3 }).where(eq(platformMasterPlans.key, "team"));
});

afterAll(async () => {
  await test.close();
});

describe("createInviteEffect and the plan's member cap", () => {
  it("refuses any invite on a plan that holds one person, and says so", async () => {
    const solo = await account("solo", "solo");

    expect(await attempt(solo, "second@example.com")).toContain("holds 1 person");
  });

  it("counts the invites still waiting with the people in the account", async () => {
    const team = await account("team", "team");

    expect([await attempt(team, "one@example.com"), await attempt(team, "two@example.com"), await attempt(team, "three@example.com")]).toEqual([
      "invited",
      "invited",
      expect.stringContaining("holds 3 people"),
    ]);
  });

  it("has no cap for an account with no plan", async () => {
    const free = await account("free", null);

    expect(await attempt(free, "anyone@example.com")).toBe("invited");
  });
});
