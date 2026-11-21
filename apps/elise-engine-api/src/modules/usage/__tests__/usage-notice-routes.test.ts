import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { authUser, ensureTenantRoles, findTenantRole, partyRoles } from "@repo/db-elise";
import { buildApp } from "#/index";
import { callAs, tenantRouteApp } from "#/__tests__/tenant-route-harness";
import { asTenant, openTestDb, seedTenant, type TestDb } from "#/__tests__/test-db";
import { testDeps } from "#/__tests__/test-deps";
import type { QueuedEmail } from "#/modules/email";

let test: TestDb;
let tenantId: string;
let otherTenantId: string;
const sent: QueuedEmail[] = [];
let enqueueFails = false;

const KEY = "sk-ant-api03-abcdefghijklmnopqrstuvwxyz-w3Zq";

const seedLogin = async (key: string, account: string, roleKey: string) => {
  const { partyId } = await seedTenant(test, `person-${key}`);
  const role = await findTenantRole(test.raw, account, roleKey);
  if (!role) throw new Error(`${roleKey} role missing`);
  await test.raw.insert(authUser).values({ id: key, name: `Name ${key}`, email: `${key}@example.com`, partyId });
  await test.raw.insert(partyRoles).values({ partyId, tenantId: account, roleId: role.id, roleScope: "tenant" });
};

const app = tenantRouteApp(() => test, {
  sessionUserId: async () => "owner",
  enqueueEmail: async (_env, mail) => {
    if (enqueueFails) throw new Error("queue down");
    sent.push(mail);
  },
});

let tenantCalls = 0;
const audienceDownApp = buildApp(
  testDeps({
    sessionUserId: async () => "owner",
    enqueueEmail: async (_env, mail) => {
      sent.push(mail);
    },
    withTenant: (_c, accountId, run) => {
      tenantCalls += 1;
      return tenantCalls > 1 ? Promise.reject(new Error("audience lookup down")) : asTenant(test, accountId, run);
    },
    withOwner: (_c, run) => run(test.pool),
  }),
).app;

const env = { KEY_ENCRYPTION_SECRET: "test-secret-test-secret-test-secret", DASHBOARD_URL: "https://app.example.com/" };
const call = (path: string, init: { method: string; body?: unknown }) => callAs(app, tenantId, path, { ...init, env });

beforeAll(async () => {
  test = await openTestDb();
  tenantId = (await seedTenant(test, "acme")).tenantId;
  otherTenantId = (await seedTenant(test, "other")).tenantId;
  await ensureTenantRoles(test.raw, tenantId);
  await ensureTenantRoles(test.raw, otherTenantId);
  await seedLogin("owner", tenantId, "tenant_admin");
  await seedLogin("member", tenantId, "workspace_member");
  await seedLogin("elsewhere", otherTenantId, "tenant_admin");
});

afterEach(() => {
  sent.length = 0;
  tenantCalls = 0;
  enqueueFails = false;
  vi.unstubAllGlobals();
});

afterAll(async () => {
  await test.close();
});

describe("Security notices for the Anthropic key and the Monthly budget", () => {
  it("queues one notice for each holder of the Power when a key is set, and none carries any part of the key", async () => {
    vi.stubGlobal("fetch", async () => new Response("{}", { status: 200 }));

    const res = await call("/usage/anthropic-key", { method: "PUT", body: { apiKey: KEY } });

    expect(res.status).toBe(200);
    expect(sent.map((mail) => mail.kind)).toEqual(["anthropic-key-changed"]);
    expect(sent[0]).toMatchObject({ to: "owner@example.com", change: "set", actorName: "Name owner", link: "https://app.example.com/settings/budget" });
    expect(JSON.stringify(sent)).not.toContain("w3Zq");
  });

  it("queues a removal notice when the key is removed", async () => {
    const res = await call("/usage/anthropic-key", { method: "DELETE" });

    expect(res.status).toBe(200);
    expect(sent).toMatchObject([{ kind: "anthropic-key-changed", to: "owner@example.com", change: "removed" }]);
  });

  it("sends no removal notice when the account had no key", async () => {
    const res = await call("/usage/anthropic-key", { method: "DELETE" });

    expect(res.status).toBe(200);
    expect(sent).toEqual([]);
  });

  it("keeps the success answer and sends nothing when the audience cannot be read", async () => {
    vi.stubGlobal("fetch", async () => new Response("{}", { status: 200 }));
    await call("/usage/anthropic-key", { method: "PUT", body: { apiKey: KEY } });
    sent.length = 0;

    const res = await callAs(audienceDownApp, tenantId, "/usage/anthropic-key", { method: "DELETE", env });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ data: { source: "platform", lastFour: null, updatedAt: null }, error: null });
    expect(sent).toEqual([]);
  });

  it("queues a notice with the old and the new value when the budget changes", async () => {
    const res = await call("/usage/budget", { method: "PATCH", body: { monthlyBudgetUsd: 15 } });

    expect(res.status).toBe(200);
    expect(sent).toMatchObject([{ kind: "budget-changed", to: "owner@example.com", previousBudgetUsd: 20, budgetUsd: 15, actorName: "Name owner" }]);
  });

  it("sends no notice when the budget is set to the value it already has", async () => {
    const res = await call("/usage/budget", { method: "PATCH", body: { monthlyBudgetUsd: 15 } });

    expect(res.status).toBe(200);
    expect(sent).toEqual([]);
  });

  it("still answers when the queue is down", async () => {
    enqueueFails = true;

    const res = await call("/usage/budget", { method: "PATCH", body: { monthlyBudgetUsd: 25 } });

    expect(res.status).toBe(200);
    expect(sent).toEqual([]);
  });
});
