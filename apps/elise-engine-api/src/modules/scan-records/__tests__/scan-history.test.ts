import { eq } from "drizzle-orm";
import { Effect } from "effect";
import { scanFindings, scanRepoFindings } from "@repo/db-elise/schema";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { fakeBindings } from "#/__tests__/fake-bindings";
import { openTestDb, seedTenant, type TestDb } from "#/__tests__/test-db";
import { resolveScanBranchEffect } from "#/modules/branches";
import type { ScanParams } from "#/schemas";
import { neonScanRepo } from "#/modules/scan-ledger";
import { buildScanRecordSvc, listPriorsEffect, SCAN_RECORDS_PRIOR_LIMIT } from "#/modules/scan-records";
import { readHistoryEffect, scanRowOfEffect, writeScanRecordEffect } from "#/modules/scan-records/queries";

let test: TestDb;
let tenantId: string;
let repoId: string;
let branchId: string;

const REPO = "https://github.com/octocat/Hello-World";
const options = { skill: "lite", model: "claude-haiku-5-5", effort: "low", profile: "quick", maxBudgetUsd: 1 } as const;
const run = <A, E>(effect: Effect.Effect<A, E>) => Effect.runPromise(effect);

type FindingExtra = { class?: string; priorId?: string; location?: { file: string; line: number }[] };

const finding = (id: string, title: string, file: string, extra: FindingExtra = {}) => ({
  id,
  status: "confirmed",
  severity: "high",
  title,
  class: "authz",
  location: [{ file, line: 10 }],
  ...extra,
});

// -----
// Queues the scan like the API does, then records it like
// the workflow does: find the branch the clone reported (main,
// read as the default), read its history and priors, build
// the record from the files the agent wrote, write it.
// -----
const scanAndRecord = async (scanId: string, files: { findings: unknown[]; recheck?: unknown[] }, status: "succeeded" | "failed" = "succeeded", branch = "main") => {
  const onDefault = branch === "main";
  const params: ScanParams = { scanId, accountId: tenantId, repo: REPO, ref: onDefault ? undefined : branch, options, createdAt: new Date().toISOString() };
  const ledger = neonScanRepo(test.http);
  await run(ledger.create(params, repoId, Date.now() - 90 * 60 * 1000));
  await run(ledger.mark(tenantId, scanId, { branch }));
  const outcome = await run(resolveScanBranchEffect(test.http, tenantId, repoId, { name: branch, ref: onDefault ? null : branch }));
  const resolved = outcome.id;
  if (!resolved) throw new Error(`the repo should have a free slot for ${branch}`);
  branchId = resolved;
  const context = {
    ...(await run(readHistoryEffect(test.http, tenantId, repoId, branchId))),
    given: await run(listPriorsEffect(test.http, tenantId, branchId, SCAN_RECORDS_PRIOR_LIMIT)),
  };
  const bindings = fakeBindings();
  bindings.store.set(`accounts/${tenantId}/scans/${scanId}/findings.json`, JSON.stringify(files.findings));
  if (files.recheck) bindings.store.set(`accounts/${tenantId}/scans/${scanId}/recheck.json`, JSON.stringify(files.recheck));
  const record = await run(buildScanRecordSvc(bindings.env.REPORTS, params, (await run(scanRowOfEffect(test.http, tenantId, scanId))).repoId, { id: branchId, name: branch, reason: null }, status, null, null, context));
  await run(writeScanRecordEffect(test.http, record));
  return { record, given: context.given, resolved };
};

const allHistory = async () => (await test.raw.select().from(scanRepoFindings)).toSorted((a, b) => a.fingerprint.localeCompare(b.fingerprint));

const stateOf = async (fingerprint: string) =>
  (await test.raw.select().from(scanRepoFindings).where(eq(scanRepoFindings.fingerprint, fingerprint)))[0];

beforeAll(async () => {
  test = await openTestDb();
  tenantId = (await seedTenant(test, "acme")).tenantId;
  repoId = (await run(neonScanRepo(test.http).ensureRepo(tenantId, REPO))).id;
});

afterAll(async () => {
  await test.close();
});

describe("a repo's history across scans", () => {
  const ids: Record<string, string> = {};

  it("the first scan makes every finding open and new, with nothing to re-check", async () => {
    const { record, given } = await scanAndRecord("s-1", {
      findings: [finding("F-001", "Missing owner check", "src/user.ts"), finding("F-002", "Hardcoded token", "src/config.ts", { class: "secrets" })],
    });

    expect(given).toEqual([]);
    expect(record.scan).toMatchObject({ priorsGiven: 0, priorsCarried: 0, priorsClosed: 0, priorsUnchecked: 0 });
    expect(record.findings.map((row) => row.origin)).toEqual(["new", "new"]);
    ids.owner = record.findings[0].fingerprint;
    ids.token = record.findings[1].fingerprint;
    expect(await stateOf(ids.owner)).toMatchObject({ state: "open", firstSeenScanId: "s-1", lastSeenScanId: "s-1" });
  });

  it("the second scan is asked about both, carries one, closes one and adds one", async () => {
    await run(neonScanRepo(test.http).mark(tenantId, "s-1", { status: "succeeded", error: null }));
    const { record, given } = await scanAndRecord("s-2", {
      findings: [finding("F-001", "Missing owner check (reworded)", "src/user.ts", { priorId: ids.owner, location: [{ file: "src/user.ts", line: 14 }] }), finding("F-002", "Open redirect", "src/login.ts", { class: "other" })],
      recheck: [{ priorId: ids.token, result: "not_found" }],
    });

    expect(given.map((prior) => prior.priorId).toSorted()).toEqual([ids.owner, ids.token].toSorted());
    expect(record.findings.map((row) => [row.origin, row.fingerprint === ids.owner])).toEqual([
      ["carried", true],
      ["new", false],
    ]);
    expect(record.scan).toMatchObject({ priorsGiven: 2, priorsCarried: 1, priorsClosed: 1, priorsUnchecked: 0 });
    expect(await stateOf(ids.owner)).toMatchObject({ state: "open", firstSeenScanId: "s-1", lastSeenScanId: "s-2" });
    expect(await stateOf(ids.token)).toMatchObject({ state: "fixed_by_code", fixedInScanId: "s-2" });
    ids.redirect = record.findings[1].fingerprint;
    expect(await stateOf(ids.redirect)).toMatchObject({ state: "open", firstSeenScanId: "s-2" });
  });

  it("stores the carried finding in its scan, so the scan lists the whole picture", async () => {
    const rows = await test.raw.select().from(scanFindings).where(eq(scanFindings.scanId, "s-2"));

    expect(rows.map((row) => row.origin).toSorted()).toEqual(["carried", "new"]);
  });

  it("a closed problem is no longer asked about; open ones are, worst first", async () => {
    const priors = await run(listPriorsEffect(test.http, tenantId, branchId, 50));

    expect(priors.map((prior) => prior.priorId).toSorted()).toEqual([ids.owner, ids.redirect].toSorted());
    expect(priors.find((prior) => prior.priorId === ids.owner)).toMatchObject({ title: "Missing owner check (reworded)", line: 14 });
  });

  it("a person's decision takes a problem out of the priors", async () => {
    await test.raw.execute(`insert into scan_finding_triage (tenant_id, repo_id, fingerprint, status) values ('${tenantId}', '${repoId}', '${ids.redirect}', 'false_positive')`);
    const priors = await run(listPriorsEffect(test.http, tenantId, branchId, 50));

    expect(priors.map((prior) => prior.priorId)).toEqual([ids.owner]);
  });

  it("a failed scan leaves the history as it was", async () => {
    await run(neonScanRepo(test.http).mark(tenantId, "s-2", { status: "succeeded", error: null }));
    const before = await allHistory();
    await scanAndRecord("s-3", { findings: [] }, "failed");

    expect(await allHistory()).toEqual(before);
  });

  it("the fixed problem, found again, is a regression", async () => {
    await run(neonScanRepo(test.http).mark(tenantId, "s-3", { status: "failed", error: "x" }));
    await scanAndRecord("s-4", { findings: [finding("F-001", "Hardcoded token", "src/config.ts", { class: "secrets" })] });

    expect(await stateOf(ids.token)).toMatchObject({ state: "regressed", fixedInScanId: "s-2", lastSeenScanId: "s-4" });
  });

  it("shows on the scan how many priors went unanswered", async () => {
    await run(neonScanRepo(test.http).mark(tenantId, "s-4", { status: "succeeded", error: null }));
    const { record, given } = await scanAndRecord("s-silent", { findings: [] });
    await run(neonScanRepo(test.http).mark(tenantId, "s-silent", { status: "succeeded", error: null }));

    expect(given.length).toBeGreaterThan(0);
    expect(record.scan).toMatchObject({ priorsGiven: given.length, priorsCarried: 0, priorsClosed: 0, priorsUnchecked: given.length });
    expect((await run(neonScanRepo(test.http).get(tenantId, "s-silent")))?.summary?.recheck).toEqual({ given: given.length, carried: 0, closed: 0, unchecked: given.length });
  });

  it("saves nothing at all when one write in the record fails", async () => {
    await run(neonScanRepo(test.http).mark(tenantId, "s-4", { status: "succeeded", error: null }));
    const params: ScanParams = { scanId: "s-5", accountId: tenantId, repo: REPO, options, createdAt: new Date().toISOString() };
    await run(neonScanRepo(test.http).create(params, repoId, Date.now() - 90 * 60 * 1000));
    const before = await allHistory();
    const bad = await run(buildScanRecordSvc(fakeBindings().env.REPORTS, params, repoId, { id: branchId, name: "main", reason: null }, "succeeded", null, null, { history: new Map(), triage: new Map(), given: [] }));
    bad.history.push({ repoId, branchId, tenantId, fingerprint: "x".repeat(64), state: "open", firstSeenScanId: "s-5", lastSeenScanId: "s-5" });
    // SAFETY: a severity outside the allowed list, to make the findings insert fail its check constraint.
    bad.findings.push({ tenantId, scanId: "s-5", findingId: "F-001", fingerprint: "y".repeat(64), status: "confirmed", severity: "nonsense" as never, title: "t", class: "c" });

    const error = await Effect.runPromise(Effect.flip(writeScanRecordEffect(test.http, bad)));

    expect(error._tag).toBe("DbError");
    expect(await allHistory()).toEqual(before);
    expect(await test.raw.select().from(scanFindings).where(eq(scanFindings.scanId, "s-5"))).toEqual([]);
  });
});

describe("a branch other than the default", () => {
  const onRelease = (scanId: string, findings: unknown[]) => scanAndRecord(scanId, { findings }, "succeeded", "release");
  const closeScans = async (ids: string[]) => {
    for (const id of ids) await run(neonScanRepo(test.http).mark(tenantId, id, { status: "failed", error: "closed by the test" }));
  };

  it("is tracked by its first successful scan, with no help from a person, and starts with an empty History", async () => {
    await closeScans(["s-5"]);

    const first = await onRelease("r-1", [finding("F-001", "Release only issue", "src/release.ts")]);

    expect(first.resolved).not.toBeNull();
    expect(first.given).toEqual([]);
    expect(first.record.scan).toMatchObject({ branch: "release", ref: "release", priorsGiven: 0, untrackedReason: null });
    expect(first.record.history.every((row) => row.branchId === first.resolved)).toBe(true);
    expect(first.resolved).not.toBe(await run(resolveScanBranchEffect(test.http, tenantId, repoId, { name: "main", ref: null })).then((outcome) => outcome.id));
  });

  it("is asked only about its own open problems on the next scan, and carries them", async () => {
    await run(neonScanRepo(test.http).mark(tenantId, "r-1", { status: "succeeded", error: null }));
    const priorId = (await test.raw.select().from(scanRepoFindings).where(eq(scanRepoFindings.lastSeenScanId, "r-1")))[0].fingerprint;

    const second = await onRelease("r-2", [finding("F-001", "Release only issue (reworded)", "src/release.ts", { priorId })]);

    expect(second.given.map((prior) => prior.priorId)).toEqual([priorId]);
    expect(second.record.scan).toMatchObject({ priorsGiven: 1, priorsCarried: 1, priorsClosed: 0, priorsUnchecked: 0 });
    expect(second.record.findings.map((row) => row.origin)).toEqual(["carried"]);
  });

  it("leaves the default branch's History as it was", async () => {
    const main = await run(resolveScanBranchEffect(test.http, tenantId, repoId, { name: "main", ref: null }));
    const mainPriors = await run(listPriorsEffect(test.http, tenantId, main.id ?? "", 50));

    expect(mainPriors.map((prior) => prior.title)).not.toContain("Release only issue (reworded)");
  });
});
