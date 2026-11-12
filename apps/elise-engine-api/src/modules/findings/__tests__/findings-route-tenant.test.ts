import { scanFindings, scans } from "@repo/db-elise/schema";
import { sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { z } from "zod";
import { buildApp } from "#/index";
import { fakeBindings, TEST_TOKEN, testExecutionContext } from "#/__tests__/fake-bindings";
import { memoryScanRepo } from "#/__tests__/memory-scan-repo";
import { noGithubAccess } from "#/__tests__/no-github-access";
import { openTestDb, scanValues, seedRepo, seedTenant, type TestDb } from "#/__tests__/test-db";

let test: TestDb;
let tenantId: string;
let otherTenantId: string;

const fp = (letter: string) => letter.repeat(64);
const FindingsBodySchema = z.object({ data: z.object({ findings: z.array(z.object({ findingId: z.string() })) }) });

// -----
// The route's real wrapper runs the job as the elise_app role with
// app.tenant_id set, inside one transaction. This one does the same
// on pglite, so a route that forgets its tenant filter is still held
// to the account the caller named.
// -----
const app = buildApp({
  scanRepo: () => memoryScanRepo().repo,
  githubAccess: noGithubAccess,
  monthSpend: async () => ({ spentUsd: 0, scans: 0, tokens: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }, budgetOverrideUsd: null, budgetAllowanceUsd: null, platformSpentUsd: 0, platformReservedUsd: 0, ownKey: false, plan: null }),
  holdCredit: async () => ({ held: true, balanceUsd: 0 }),
  releaseCredit: async () => ({ settled: true, chargeUsd: 0 }),
  sessionUserId: async () => undefined,
  userHasAccount: async () => true,
  userHasPower: async () => true,
  enqueueInviteEmail: async () => undefined,
  withTenant: (_c, accountId, run) =>
    test.raw.transaction(async (tx) => {
      await tx.execute(sql`set local role elise_app`);
      await tx.execute(sql`select set_config('app.tenant_id', ${accountId}, true)`);
      // SAFETY: the pglite transaction answers the same calls as the pg transaction the route's real wrapper passes.
      return run(tx as never);
    }),
}).app;

const listFindings = async (accountId: string, search = "") => {
  const { env } = fakeBindings();
  const res = await app.fetch(new Request(`http://localhost/findings${search}`, { headers: { authorization: `Bearer ${TEST_TOKEN}`, "x-account-id": accountId } }), env, testExecutionContext);
  return FindingsBodySchema.parse(await res.json()).data.findings.map((finding) => finding.findingId);
};

beforeAll(async () => {
  test = await openTestDb();
  tenantId = (await seedTenant(test, "acme")).tenantId;
  otherTenantId = (await seedTenant(test, "other")).tenantId;
  const repoId = await seedRepo(test, tenantId);
  const otherRepoId = await seedRepo(test, otherTenantId);
  await test.raw.insert(scans).values([scanValues(tenantId, repoId, "mine", "2026-11-01T00:00:00Z"), scanValues(otherTenantId, otherRepoId, "theirs", "2026-11-01T00:00:00Z")]);
  await test.raw.insert(scanFindings).values([
    { tenantId, scanId: "mine", findingId: "F-MINE", fingerprint: fp("a"), status: "confirmed", severity: "high", title: "mine", class: "authz" },
    { tenantId: otherTenantId, scanId: "theirs", findingId: "F-THEIRS", fingerprint: fp("b"), status: "confirmed", severity: "high", title: "theirs", class: "authz" },
  ]);
});

afterAll(async () => {
  await test.close();
});

describe("GET /findings as one account", () => {
  it("lists only the findings of the account in x-account-id", async () => {
    expect(await listFindings(tenantId)).toEqual(["F-MINE"]);
    expect(await listFindings(otherTenantId)).toEqual(["F-THEIRS"]);
  });

  it("returns nothing when the caller names another account's scan", async () => {
    expect(await listFindings(tenantId, "?scanId=theirs")).toEqual([]);
  });
});
