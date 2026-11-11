import { eq } from "drizzle-orm";
import { Effect } from "effect";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ensureTenantRoles, findTenantRole, partyRoles, platformMasterPlans, tenantSubscriptions, tenantTeamInvites } from "@repo/db-elise";
import { openTestDb, seedTenant, type TestDb } from "#/__tests__/test-db";
import { planDetailsEffect } from "#/modules/plan";

let test: TestDb;

const NOW = new Date("2026-11-11T10:00:00Z");
const details = (tenantId: string) => Effect.runPromise(planDetailsEffect(test.http, tenantId, NOW));

beforeAll(async () => {
  test = await openTestDb();
});

afterAll(async () => {
  await test.close();
});

describe("planDetailsEffect", () => {
  it("gives the plan and subscription, and counts the people and the invites still waiting", async () => {
    const { tenantId, partyId } = await seedTenant(test, "acme");
    await ensureTenantRoles(test.raw, tenantId);
    const role = await findTenantRole(test.raw, tenantId, "workspace_member");
    const [plan] = await test.raw.select().from(platformMasterPlans).where(eq(platformMasterPlans.key, "pro"));
    await test.raw.insert(tenantSubscriptions).values({ tenantId, planId: plan.id, status: "past_due", source: "grant" });
    await test.raw.insert(partyRoles).values({ partyId, tenantId, roleId: role!.id, roleScope: "tenant" });
    const invite = (email: string, extra: Partial<typeof tenantTeamInvites.$inferInsert> = {}) => ({
      tenantId,
      email,
      roleId: role!.id,
      tokenHash: crypto.randomUUID(),
      invitedBy: partyId,
      expiresAt: new Date("2026-11-18T00:00:00Z"),
      ...extra,
    });
    await test.raw.insert(tenantTeamInvites).values([
      invite("waiting@example.com"),
      invite("expired@example.com", { expiresAt: new Date("2026-11-01T00:00:00Z") }),
      invite("revoked@example.com", { revokedAt: new Date("2026-11-10T00:00:00Z") }),
    ]);

    const result = await details(tenantId);

    expect(result).toMatchObject({
      plan: { key: "pro", monthlyPriceUsd: 49, includedCreditUsd: 49, carryCapUsd: 100, keySource: "platform", scanAllowance: null, maxMembers: 5 },
      status: "past_due",
      source: "grant",
      currentPeriodEnd: null,
      scans: 0,
      seats: { members: 1, pendingInvites: 1 },
    });
  });

  it("has no plan fields for an account with no plan, but still counts its people", async () => {
    const { tenantId, partyId } = await seedTenant(test, "bare");
    await ensureTenantRoles(test.raw, tenantId);
    const role = await findTenantRole(test.raw, tenantId, "workspace_member");
    await test.raw.insert(partyRoles).values({ partyId, tenantId, roleId: role!.id, roleScope: "tenant" });

    expect(await details(tenantId)).toEqual({ plan: null, status: null, source: null, currentPeriodEnd: null, scans: 0, seats: { members: 1, pendingInvites: 0 } });
  });
});
