import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { scanFindings, scans } from "@repo/db-elise/schema";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildApp } from "#/index";
import { fakeBindings, TEST_TOKEN, testExecutionContext } from "#/__tests__/fake-bindings";
import { memoryScanRepo } from "#/__tests__/memory-scan-repo";
import { noGithubAccess } from "#/__tests__/no-github-access";
import { OWNER_CONNECTION_USES } from "#/__tests__/owner-connection-uses";
import { openTestDb, scanValues, seedRepo, seedTenant, type TestDb } from "#/__tests__/test-db";
import { CROSS_ACCOUNT_CASES, NOT_TENANT_ROUTES, type CrossAccountCase } from "#/__tests__/tenant-route-cases";

const EnvelopeSchema = z.object({ data: z.record(z.string(), z.unknown()).nullable() });

let test: TestDb;
let tenantId: string;

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
  enqueuePasswordResetEmail: async () => undefined,
  withTenant: (_c, accountId, run) =>
    test.raw.transaction(async (tx) => {
      await tx.execute(sql`set local role elise_app`);
      await tx.execute(sql`select set_config('app.tenant_id', ${accountId}, true)`);
      // SAFETY: the pglite transaction answers the same calls as the pg transaction the route's real wrapper passes.
      return run(tx as never);
    }),
}).app;

const mountedRoutes = [...new Set(app.routes.filter((route) => route.method !== "ALL").map((route) => `${route.method} ${route.path}`))];
const tenantRoutes = mountedRoutes.filter((route) => !NOT_TENANT_ROUTES.includes(route));
const caseEntries = Object.entries<CrossAccountCase>(CROSS_ACCOUNT_CASES);
const runCases = caseEntries.flatMap(([route, found]) => (found.kind === "run" ? [{ route, ...found }] : []));
const allowedOwnerUses = new Map<string, number>(Object.entries(OWNER_CONNECTION_USES));
const SRC = resolve(__dirname, "..");
const OWNER_USE = /\b(dbConnect|poolConnect|withPool)\(|\bDATABASE_URL\b/g;

const ownerUsesBySourceFile = () =>
  Object.fromEntries(
    readdirSync(SRC, { recursive: true, encoding: "utf8" })
      .filter((file) => file.endsWith(".ts") && !file.endsWith(".d.ts") && !file.includes("__tests__"))
      .map((file) => [file.split("\\").join("/"), (readFileSync(join(SRC, file), "utf8").match(OWNER_USE) ?? []).length] as const)
      .filter(([, uses]) => uses > 0),
  );

beforeAll(async () => {
  test = await openTestDb();
  tenantId = (await seedTenant(test, "acme")).tenantId;
  const otherTenantId = (await seedTenant(test, "other")).tenantId;
  const otherRepoId = await seedRepo(test, otherTenantId);
  await test.raw.insert(scans).values(scanValues(otherTenantId, otherRepoId, "theirs", "2026-11-01T00:00:00Z"));
  await test.raw.insert(scanFindings).values({ tenantId: otherTenantId, scanId: "theirs", findingId: "F-THEIRS", fingerprint: "b".repeat(64), status: "confirmed", severity: "high", title: "theirs", class: "authz" });
});

afterAll(async () => {
  await test.close();
});

describe("every tenant route has a cross-account case", () => {
  it("lists a case for each route the app mounts", () => {
    expect(tenantRoutes.filter((route) => !(route in CROSS_ACCOUNT_CASES))).toEqual([]);
  });

  it("lists no case for a route the app no longer mounts", () => {
    expect(Object.keys(CROSS_ACCOUNT_CASES).filter((route) => !tenantRoutes.includes(route))).toEqual([]);
  });

  it("lists no route as not-tenant that the app no longer mounts", () => {
    expect(NOT_TENANT_ROUTES.filter((route) => !mountedRoutes.includes(route))).toEqual([]);
  });

  it.each(runCases)("$route answers one Account with nothing of another's", async ({ path, expect: outcome }) => {
    const { env } = fakeBindings();
    const res = await app.fetch(new Request(`http://localhost${path}`, { headers: { authorization: `Bearer ${TEST_TOKEN}`, "x-account-id": tenantId } }), env, testExecutionContext);
    const { data } = EnvelopeSchema.parse(await res.json());
    const lists = Object.values(data ?? {}).filter(Array.isArray);
    expect(outcome === "not-found" ? [res.status, 0] : [res.status, lists.flat().length]).toEqual(outcome === "not-found" ? [404, 0] : [200, 0]);
  });
});

describe("the owner connection stays inside its list", () => {
  it("opens it from no file outside the list, and no more often than listed", () => {
    const used = ownerUsesBySourceFile();
    expect(Object.entries(used).filter(([file, uses]) => uses > (allowedOwnerUses.get(file) ?? 0))).toEqual([]);
  });

  it("lists no file that stopped using it", () => {
    const used = ownerUsesBySourceFile();
    expect([...allowedOwnerUses.keys()].filter((file) => !(file in used))).toEqual([]);
  });
});
