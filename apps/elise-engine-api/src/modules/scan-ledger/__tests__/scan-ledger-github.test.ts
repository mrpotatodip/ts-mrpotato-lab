import { Effect } from "effect";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { scanRepos, scans, tenantGithubInstallations } from "@repo/db-elise/schema";
import { eq } from "drizzle-orm";
import { openTestDb, seedTenant, type TestDb } from "#/__tests__/test-db";
import type { ScanGithub, ScanParams } from "#/schemas";
import { neonScanRepo } from "#/modules/scan-ledger";

let test: TestDb;
let acme: string;
let other: string;
let acmeInstall: string;
let otherInstall: string;

const install = async (tenant: { tenantId: string; partyId: string }, installationId: number) => {
  const [row] = await test.raw
    .insert(tenantGithubInstallations)
    .values({ tenantId: tenant.tenantId, installationId, accountLogin: "octo", repositorySelection: "all", connectedBy: tenant.partyId, noticeAcceptedAt: new Date() })
    .returning();
  return row.id;
};

beforeAll(async () => {
  test = await openTestDb();
  const first = await seedTenant(test, "acme");
  const second = await seedTenant(test, "other");
  acme = first.tenantId;
  other = second.tenantId;
  acmeInstall = await install(first, 42);
  otherInstall = await install(second, 99);
});

afterAll(async () => {
  await test.close();
});

const paramsFor = (accountId: string, scanId: string, github?: ScanGithub): ScanParams => ({
  scanId,
  accountId,
  repo: `https://github.com/octo/${scanId}`,
  github,
  options: { skill: "lite", model: "claude-haiku-5-5", effort: "low", profile: "quick", maxBudgetUsd: 1 },
  createdAt: new Date().toISOString(),
});

const NOW = () => Date.now();

describe("neonScanRepo.create with a GitHub install", () => {
  it("saves the install, the GitHub repo and the private flag on the scan, and the flag on the repo", async () => {
    const repo = neonScanRepo(test.http);
    const record = await Effect.runPromise(repo.ensureRepo(acme, "https://github.com/octo/signed"));
    const github: ScanGithub = { installationRowId: acmeInstall, installationId: 42, repoId: 7, repo: "octo/signed", isPrivate: true };

    await Effect.runPromise(repo.create(paramsFor(acme, "signed", github), record.id, NOW()));

    const [scan] = await test.raw.select().from(scans).where(eq(scans.id, "signed"));
    expect(scan).toMatchObject({ installationId: acmeInstall, githubRepoId: 7, isPrivate: true });
    const [row] = await test.raw.select().from(scanRepos).where(eq(scanRepos.id, record.id));
    expect(row.isPrivate).toBe(true);
  });

  it("leaves all three empty for an anonymous clone", async () => {
    const repo = neonScanRepo(test.http);
    const record = await Effect.runPromise(repo.ensureRepo(acme, "https://github.com/octo/open"));

    await Effect.runPromise(repo.create(paramsFor(acme, "open"), record.id, NOW()));

    const [scan] = await test.raw.select().from(scans).where(eq(scans.id, "open"));
    expect(scan).toMatchObject({ installationId: null, githubRepoId: null, isPrivate: null });
    const [row] = await test.raw.select().from(scanRepos).where(eq(scanRepos.id, record.id));
    expect(row.isPrivate).toBeNull();
  });

  it("shows the private flag in the scan the API returns, and nothing for an anonymous clone", async () => {
    const repo = neonScanRepo(test.http);
    const closed = await Effect.runPromise(repo.ensureRepo(acme, "https://github.com/octo/shown-private"));
    const open = await Effect.runPromise(repo.ensureRepo(acme, "https://github.com/octo/shown-open"));
    const github: ScanGithub = { installationRowId: acmeInstall, installationId: 42, repoId: 9, repo: "octo/shown-private", isPrivate: true };
    await Effect.runPromise(repo.create(paramsFor(acme, "shown-private", github), closed.id, NOW()));
    await Effect.runPromise(repo.create(paramsFor(acme, "shown-open"), open.id, NOW()));

    const privateScan = await Effect.runPromise(repo.get(acme, "shown-private"));
    const openScan = await Effect.runPromise(repo.get(acme, "shown-open"));

    expect(privateScan?.isPrivate).toBe(true);
    expect(openScan?.isPrivate ?? null).toBeNull();
  });

  it("refuses an install of another Account: the database itself says no", async () => {
    const repo = neonScanRepo(test.http);
    const record = await Effect.runPromise(repo.ensureRepo(acme, "https://github.com/octo/stolen"));
    const github: ScanGithub = { installationRowId: otherInstall, installationId: 99, repoId: 7, repo: "octo/stolen", isPrivate: true };

    const error = await Effect.runPromise(Effect.flip(repo.create(paramsFor(acme, "stolen", github), record.id, NOW())));

    expect(error._tag).toBe("DbError");
    expect(await test.raw.select().from(scans).where(eq(scans.id, "stolen"))).toEqual([]);
    expect(other).not.toBe(acme);
  });
});
