import { Effect } from "effect";
import type { FilesQuery } from "@repo/contracts/elise";
import { scanFiles, scans } from "@repo/db-elise/schema";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { openTestDb, scanValues, seedRepo, seedTenant, type TestDb } from "#/__tests__/test-db";
import { listFilesSvc } from "#/modules/files/handlers";
import { countFilesEffect, listFilesEffect } from "#/modules/files/queries";
import { scanKey } from "#/modules/scan-store";

let test: TestDb;
let tenantId: string;
let otherTenantId: string;
let repoId: string;
let otherRepoId: string;
let apiRepoId: string;

const HELLO = "https://github.com/octocat/Hello-World";
const API = "https://github.com/acme/api_100%";

const file = (tenant: string, scanId: string, name: string, createdAt: string, r2Key = scanKey(tenant, scanId, name)) => ({
  tenantId: tenant,
  scanId,
  name,
  r2Key,
  sizeBytes: 10,
  contentType: name.endsWith(".json") ? "application/json" : "text/markdown; charset=utf-8",
  createdAt: new Date(createdAt),
});

const query = (overrides: Partial<FilesQuery> = {}): FilesQuery => ({ limit: 50, ...overrides });
const keys = (rows: { scanId: string; name: string }[]) => rows.map((row) => `${row.scanId}/${row.name}`);
const list = async (overrides: Partial<FilesQuery> = {}) => Effect.runPromise(listFilesEffect(test.http, tenantId, query(overrides)));

beforeAll(async () => {
  test = await openTestDb();
  tenantId = (await seedTenant(test, "acme")).tenantId;
  otherTenantId = (await seedTenant(test, "other")).tenantId;
  repoId = await seedRepo(test, tenantId, HELLO);
  apiRepoId = await seedRepo(test, tenantId, API);
  otherRepoId = await seedRepo(test, otherTenantId, HELLO);
  await test.raw.insert(scans).values([
    scanValues(tenantId, repoId, "a-old", "2026-11-01T00:00:00Z"),
    scanValues(tenantId, repoId, "b-new", "2026-11-03T00:00:00Z", { branch: "dev" }),
    scanValues(tenantId, apiRepoId, "c-fail", "2026-11-02T00:00:00Z", { repo: API, status: "failed" }),
    scanValues(otherTenantId, otherRepoId, "z-theirs", "2026-11-04T00:00:00Z"),
  ]);
  await test.raw.insert(scanFiles).values([
    file(tenantId, "a-old", "REPORT.md", "2026-11-01T00:00:00Z"),
    file(tenantId, "a-old", "findings.json", "2026-11-01T00:00:00Z"),
    file(tenantId, "b-new", "REPORT.md", "2026-11-03T00:00:00Z"),
    file(tenantId, "b-new", "NEEDS-VALIDATION.md", "2026-11-03T00:00:00Z"),
    file(tenantId, "c-fail", "REPORT.md", "2026-11-02T00:00:00Z"),
    file(otherTenantId, "z-theirs", "REPORT.md", "2026-11-04T00:00:00Z"),
  ]);
});

afterAll(async () => {
  await test.close();
});

describe("listFilesEffect", () => {
  it("lists the written files newest first and leaves out the machine-readable ones", async () => {
    expect(keys(await list())).toEqual(["b-new/NEEDS-VALIDATION.md", "b-new/REPORT.md", "c-fail/REPORT.md", "a-old/REPORT.md"]);
  });

  it("never shows another account's files", async () => {
    expect(keys(await list())).not.toContain("z-theirs/REPORT.md");
    const theirs = await Effect.runPromise(listFilesEffect(test.http, otherTenantId, query()));
    expect(keys(theirs)).toEqual(["z-theirs/REPORT.md"]);
  });

  it("leaves out a file whose key sits outside the account's prefix", async () => {
    await test.raw.insert(scanFiles).values(file(tenantId, "a-old", "FINDINGS-DETAIL.md", "2026-11-05T00:00:00Z", scanKey(otherTenantId, "a-old", "FINDINGS-DETAIL.md")));

    expect(keys(await list())).not.toContain("a-old/FINDINGS-DETAIL.md");
  });

  it("carries the repo, branch and scan status", async () => {
    const [row] = await list({ repoId: apiRepoId });

    expect(row).toMatchObject({ scanId: "c-fail", repo: API, repoId: apiRepoId, branch: null, status: "failed", sizeBytes: 10 });
  });

  it("filters by branch, file name and date range", async () => {
    expect(keys(await list({ branch: "dev" }))).toEqual(["b-new/NEEDS-VALIDATION.md", "b-new/REPORT.md"]);
    expect(keys(await list({ name: "NEEDS-VALIDATION.md" }))).toEqual(["b-new/NEEDS-VALIDATION.md"]);
    expect(keys(await list({ from: "2026-11-02T00:00:00Z", to: "2026-11-02T23:59:59Z" }))).toEqual(["c-fail/REPORT.md"]);
  });

  it("matches q against the repo URL and treats % and _ as plain text", async () => {
    expect(keys(await list({ q: "hello-world" }))).toEqual(["b-new/NEEDS-VALIDATION.md", "b-new/REPORT.md", "a-old/REPORT.md"]);
    expect(keys(await list({ q: "api_100%" }))).toEqual(["c-fail/REPORT.md"]);
    expect(await list({ q: "%" })).toHaveLength(1);
  });
});

describe("countFilesEffect", () => {
  const counts = async (tenant: string, overrides: Partial<FilesQuery> = {}) =>
    Object.fromEntries((await Effect.runPromise(countFilesEffect(test.http, tenant, query(overrides)))).map(({ name, count }) => [name, count]));

  it("counts each listed type, with 0 for a type that has no files", async () => {
    expect(await counts(tenantId)).toEqual({ "REPORT.md": 3, "FINDINGS-DETAIL.md": 0, "NEEDS-VALIDATION.md": 1 });
  });

  it("ignores the type filter, so every tab keeps its own count", async () => {
    expect(await counts(tenantId, { name: "NEEDS-VALIDATION.md" })).toEqual(await counts(tenantId));
  });

  it("follows the other filters", async () => {
    expect(await counts(tenantId, { repoId: apiRepoId })).toEqual({ "REPORT.md": 1, "FINDINGS-DETAIL.md": 0, "NEEDS-VALIDATION.md": 0 });
  });

  it("counts only the account's own files", async () => {
    expect(await counts(otherTenantId)).toEqual({ "REPORT.md": 1, "FINDINGS-DETAIL.md": 0, "NEEDS-VALIDATION.md": 0 });
  });
});

describe("listFilesSvc", () => {
  it("sends the counts with the page", async () => {
    const page = await Effect.runPromise(listFilesSvc(test.http, tenantId, query({ name: "REPORT.md" })));

    expect(page.counts).toEqual([
      { name: "REPORT.md", count: 3 },
      { name: "FINDINGS-DETAIL.md", count: 0 },
      { name: "NEEDS-VALIDATION.md", count: 1 },
    ]);
  });

  it("pages with an offset cursor and ends with null", async () => {
    const first = await Effect.runPromise(listFilesSvc(test.http, tenantId, query({ limit: 3 })));
    const second = await Effect.runPromise(listFilesSvc(test.http, tenantId, query({ limit: 3, cursor: first.nextCursor ?? undefined })));

    expect(keys(first.files)).toEqual(["b-new/NEEDS-VALIDATION.md", "b-new/REPORT.md", "c-fail/REPORT.md"]);
    expect(first.nextCursor).toBe("3");
    expect(keys(second.files)).toEqual(["a-old/REPORT.md"]);
    expect(second.nextCursor).toBeNull();
  });
});
