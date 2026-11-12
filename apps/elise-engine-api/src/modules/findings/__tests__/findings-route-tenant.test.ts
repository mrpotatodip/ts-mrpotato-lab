import { scanFindings, scans } from "@repo/db-elise/schema";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { z } from "zod";
import { openTestDb, scanValues, seedRepo, seedTenant, type TestDb } from "#/__tests__/test-db";
import { callAs, tenantRouteApp } from "#/__tests__/tenant-route-harness";

let test: TestDb;
let tenantId: string;
let otherTenantId: string;

const fp = (letter: string) => letter.repeat(64);
const FindingsBodySchema = z.object({ data: z.object({ findings: z.array(z.object({ findingId: z.string() })) }) });

const app = tenantRouteApp(() => test);

const listFindings = async (accountId: string, search = "") => {
  const res = await callAs(app, accountId, `/findings${search}`);
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
