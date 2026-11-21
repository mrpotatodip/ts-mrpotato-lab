import { eq } from "drizzle-orm";
import { Effect } from "effect";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { z } from "zod";
import { authUser, ensureTenantRoles, findTenantRole, partyRoles, tenantRunners } from "@repo/db-elise";
import { callAs, tenantRouteApp } from "#/__tests__/tenant-route-harness";
import { openTestDb, seedTenant, type TestDb } from "#/__tests__/test-db";
import type { QueuedEmail } from "#/modules/email";
import { startRunnerLoginSvc } from "#/modules/runners/handlers";

let test: TestDb;
let tenantId: string;
let otherTenantId: string;
let actorPartyId: string;
let sent: QueuedEmail[] = [];
const ACTOR = "actor";

const seedLogin = async (key: string, account: string, roleKey: string) => {
  const { partyId } = await seedTenant(test, `person-${key}`);
  const role = await findTenantRole(test.raw, account, roleKey);
  if (!role) throw new Error(`${roleKey} role missing`);
  await test.raw.insert(authUser).values({ id: key, name: `Name ${key}`, email: `${key}@example.com`, partyId });
  await test.raw.insert(partyRoles).values({ partyId, tenantId: account, roleId: role.id, roleScope: "tenant" });
  return partyId;
};

const app = tenantRouteApp(() => test, {
  sessionUserId: async () => ACTOR,
  enqueueEmail: async (_env, mail) => {
    sent.push(mail);
  },
});

const recipients = () => sent.map((mail) => mail.to).toSorted();

beforeAll(async () => {
  test = await openTestDb();
  tenantId = (await seedTenant(test, "acme")).tenantId;
  otherTenantId = (await seedTenant(test, "other")).tenantId;
  await ensureTenantRoles(test.raw, tenantId);
  await ensureTenantRoles(test.raw, otherTenantId);
  actorPartyId = await seedLogin(ACTOR, tenantId, "tenant_admin");
  await seedLogin("second-admin", tenantId, "tenant_admin");
  await seedLogin("member", tenantId, "workspace_member");
  await seedLogin("elsewhere", otherTenantId, "tenant_admin");
});

afterAll(async () => {
  await test.close();
});

describe("Runner notices", () => {
  it("queues a Runner added notice to every holder of company:runners:create when a Runner is created", async () => {
    sent = [];
    const res = await callAs(app, tenantId, "/runners", { method: "POST", body: { name: "Ada's Mac" } });
    const { data } = z.object({ data: z.object({ id: z.string() }) }).parse(await res.json());

    expect(res.status).toBe(201);
    expect(recipients()).toEqual(["actor@example.com", "second-admin@example.com"]);
    expect(sent[0]).toMatchObject({ kind: "runner-added", accountId: tenantId, runnerId: data.id, actorUserId: ACTOR });
  });

  it("queues a Runner added notice when a Runner login is approved", async () => {
    sent = [];
    const started = await Effect.runPromise(startRunnerLoginSvc(test.http, { name: "box", os: "linux", cpu: "x64", version: "0.1.0" }, { ip: "203.0.113.7", dashboardUrl: "https://app.test" }));
    const res = await callAs(app, tenantId, "/runners/login/approve", { method: "POST", body: { userCode: started.userCode, name: "Build box" } });
    const { data } = z.object({ data: z.object({ runnerId: z.string() }) }).parse(await res.json());

    expect(res.status).toBe(200);
    expect(recipients()).toEqual(["actor@example.com", "second-admin@example.com"]);
    expect(sent[0]).toMatchObject({ kind: "runner-added", runnerId: data.runnerId });
  });

  it("queues no notice when the approval is refused", async () => {
    sent = [];
    const res = await callAs(app, tenantId, "/runners/login/approve", { method: "POST", body: { userCode: "ZZZZ-ZZZZ", name: "Build box" } });

    expect(res.status).toBe(403);
    expect(sent).toEqual([]);
  });

  it("queues a Runner removed notice to every holder of company:runners:delete when a Runner is removed", async () => {
    const [runner] = await test.raw.insert(tenantRunners).values({ tenantId, name: "Old box", createdBy: actorPartyId }).returning({ id: tenantRunners.id });
    sent = [];
    const res = await callAs(app, tenantId, `/runners/${runner?.id}`, { method: "DELETE" });

    expect(res.status).toBe(200);
    expect(recipients()).toEqual(["actor@example.com", "second-admin@example.com"]);
    expect(sent[0]).toMatchObject({ kind: "runner-removed", accountId: tenantId, runnerId: runner?.id, actorUserId: ACTOR });
  });

  it("queues nothing for a Runner that is not in the Account", async () => {
    sent = [];
    const res = await callAs(app, tenantId, `/runners/${crypto.randomUUID()}`, { method: "DELETE" });

    expect(res.status).toBe(404);
    expect(sent).toEqual([]);
  });

  it("still answers when the queue refuses the notice", async () => {
    const failing = tenantRouteApp(() => test, {
      sessionUserId: async () => ACTOR,
      enqueueEmail: async () => {
        throw new Error("queue down");
      },
    });
    const res = await callAs(failing, tenantId, "/runners", { method: "POST", body: { name: "Quiet Mac" } });

    expect(res.status).toBe(201);
    expect(await test.raw.select().from(tenantRunners).where(eq(tenantRunners.name, "Quiet Mac"))).toHaveLength(1);
  });
});
