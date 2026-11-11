import { Effect } from "effect";
import type { FindingsQuery } from "@repo/contracts/elise";
import { scanFindings, scans } from "@repo/db-elise/schema";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { openTestDb, scanValues, seedRepo, seedTenant, type TestDb } from "#/__tests__/test-db";
import { findingRepoIdEffect, listFindingsEffect, setTriageEffect } from "#/modules/findings/queries";
import { listFindingsSvc } from "#/modules/findings/handlers";

let test: TestDb;
let tenantId: string;
let otherTenantId: string;
let repoId: string;
let otherRepoId: string;

const REPO = "https://github.com/octocat/Hello-World";
const fp = (letter: string) => letter.repeat(64);

const scanRow = (id: string, createdAt: string, status: "succeeded" | "failed", tenant = tenantId) =>
  scanValues(tenant, tenant === tenantId ? repoId : otherRepoId, id, createdAt, { status });

const finding = (scanId: string, findingId: string, letter: string, severity: "high" | "low" | "critical" | null, tenant = tenantId) => ({
  tenantId: tenant,
  scanId,
  findingId,
  fingerprint: fp(letter),
  status: severity ? ("confirmed" as const) : ("needs_validation" as const),
  severity,
  title: `finding ${findingId}`,
  class: "authz",
});

const query = (overrides: Partial<FindingsQuery> = {}): FindingsQuery => ({ limit: 50, ...overrides });

beforeAll(async () => {
  test = await openTestDb();
  tenantId = (await seedTenant(test, "acme")).tenantId;
  otherTenantId = (await seedTenant(test, "other")).tenantId;
  repoId = await seedRepo(test, tenantId, REPO);
  otherRepoId = await seedRepo(test, otherTenantId, REPO);
  await test.raw.insert(scans).values([
    scanRow("old", "2026-11-01T00:00:00Z", "succeeded"),
    scanRow("new", "2026-11-02T00:00:00Z", "succeeded"),
    scanRow("newest-failed", "2026-11-03T00:00:00Z", "failed"),
    scanRow("theirs", "2026-11-02T00:00:00Z", "succeeded", otherTenantId),
  ]);
  await test.raw.insert(scanFindings).values([
    finding("old", "F-OLD", "e", "high"),
    finding("new", "F-001", "a", "low"),
    finding("new", "F-002", "b", "critical"),
    finding("new", "F-003", "c", null),
    finding("theirs", "F-X", "d", "high", otherTenantId),
  ]);
});

afterAll(async () => {
  await test.close();
});

const ids = (rows: { findingId: string }[]) => rows.map((row) => row.findingId);

describe("listFindingsEffect", () => {
  it("returns the newest successful scan's findings, worst first, with unvalidated last", async () => {
    const rows = await Effect.runPromise(listFindingsEffect(test.http, tenantId, query()));

    expect(ids(rows)).toEqual(["F-002", "F-001", "F-003"]);
  });

  it("never shows another account's findings", async () => {
    const rows = await Effect.runPromise(listFindingsEffect(test.http, tenantId, query({ scanId: "theirs" })));

    expect(rows).toEqual([]);
  });

  it("reads one scan when scanId is set, even an older one", async () => {
    expect(ids(await Effect.runPromise(listFindingsEffect(test.http, tenantId, query({ scanId: "old" }))))).toEqual(["F-OLD"]);
  });

  it("filters by severity and by status", async () => {
    expect(ids(await Effect.runPromise(listFindingsEffect(test.http, tenantId, query({ severity: "low" }))))).toEqual(["F-001"]);
    expect(ids(await Effect.runPromise(listFindingsEffect(test.http, tenantId, query({ status: "needs_validation" }))))).toEqual(["F-003"]);
  });

  it("returns one extra row so the service can tell there is another page", async () => {
    const page = await Effect.runPromise(listFindingsSvc(test.http, tenantId, query({ limit: 2 })));
    const next = await Effect.runPromise(listFindingsSvc(test.http, tenantId, query({ limit: 2, cursor: page.nextCursor ?? undefined })));

    expect(ids(page.findings)).toEqual(["F-002", "F-001"]);
    expect(page.nextCursor).toBe("2");
    expect(ids(next.findings)).toEqual(["F-003"]);
    expect(next.nextCursor).toBeNull();
  });
});

describe("triage", () => {
  it("finds the repo of a finding for this account, in any spelling of the URL", async () => {
    expect(await Effect.runPromise(findingRepoIdEffect(test.http, tenantId, REPO, fp("a")))).toBe(repoId);
    expect(await Effect.runPromise(findingRepoIdEffect(test.http, tenantId, "https://github.com/OCTOCAT/hello-WORLD.git/", fp("a")))).toBe(repoId);
    expect(await Effect.runPromise(findingRepoIdEffect(test.http, tenantId, REPO, fp("z")))).toBeNull();
    expect(await Effect.runPromise(findingRepoIdEffect(test.http, tenantId, REPO, fp("d")))).toBeNull();
  });

  it("saves a decision that then shows on the finding and filters it out of open", async () => {
    const saved = await Effect.runPromise(setTriageEffect(test.pool, tenantId, repoId, { repo: REPO, fingerprint: fp("a"), status: "false_positive", note: "fixture" }, undefined, new Date()));
    const all = await Effect.runPromise(listFindingsEffect(test.http, tenantId, query()));
    const open = await Effect.runPromise(listFindingsEffect(test.http, tenantId, query({ triage: "open" })));
    const decided = await Effect.runPromise(listFindingsEffect(test.http, tenantId, query({ triage: "false_positive" })));

    expect(saved).toMatchObject({ status: "false_positive", note: "fixture" });
    expect(all.find((row) => row.findingId === "F-001")?.triage).toMatchObject({ status: "false_positive", note: "fixture" });
    expect(ids(open)).toEqual(["F-002", "F-003"]);
    expect(ids(decided)).toEqual(["F-001"]);
  });

  it("changes the decision on a second save instead of adding a row", async () => {
    await Effect.runPromise(setTriageEffect(test.pool, tenantId, repoId, { repo: REPO, fingerprint: fp("a"), status: "fixed" }, undefined, new Date()));
    const rows = await Effect.runPromise(listFindingsEffect(test.http, tenantId, query({ triage: "fixed" })));

    expect(ids(rows)).toEqual(["F-001"]);
    expect(rows[0].triage?.note).toBeNull();
  });

  it("keeps the decision when a newer scan finds the same problem", async () => {
    await test.raw.insert(scans).values(scanRow("rescan", "2026-11-05T00:00:00Z", "succeeded"));
    await test.raw.insert(scanFindings).values(finding("rescan", "F-001", "a", "low"));
    const rows = await Effect.runPromise(listFindingsEffect(test.http, tenantId, query()));

    expect(ids(rows)).toEqual(["F-001"]);
    expect(rows[0]).toMatchObject({ scanId: "rescan", triage: { status: "fixed" } });
  });

describe("scans of a ref", () => {
  it("do not replace the default view of a repo's findings, but can be asked for by scan id", async () => {
    await test.raw.insert(scans).values(scanValues(tenantId, repoId, "on-branch", "2026-11-09T00:00:00Z", { ref: "feature/x" }));
    await test.raw.insert(scanFindings).values(finding("on-branch", "F-BRANCH", "f", "high"));

    expect(ids(await Effect.runPromise(listFindingsEffect(test.http, tenantId, query())))).not.toContain("F-BRANCH");
    expect(ids(await Effect.runPromise(listFindingsEffect(test.http, tenantId, query({ scanId: "on-branch" }))))).toEqual(["F-BRANCH"]);
  });
});
});
