import { Effect } from "effect";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { scanFindings } from "@repo/db-elise/schema";
import { openTestDb, seedTenant, type TestDb } from "#/__tests__/test-db";
import type { ScanParams } from "#/schemas";
import { neonScanRepo } from "#/modules/scan-ledger";

let test: TestDb;
let acme: string;
let other: string;

beforeAll(async () => {
  test = await openTestDb();
  acme = (await seedTenant(test, "acme")).tenantId;
  other = (await seedTenant(test, "other")).tenantId;
});

afterAll(async () => {
  await test.close();
});

const paramsFor = (accountId: string, scanId: string): ScanParams => ({
  scanId,
  accountId,
  repo: `https://github.com/octocat/${scanId}`,
  options: { skill: "lite", model: "claude-haiku-5-5", effort: "low", profile: "quick", maxBudgetUsd: 1 },
  createdAt: new Date().toISOString(),
});

const STALE_AFTER = () => Date.now() - 90 * 60 * 1000;

// -----
// Queues a scan on its own repo, so a test is not stopped
// by the one-active-scan-per-repo rule.
// -----
const queue = async (repo: ReturnType<typeof neonScanRepo>, params: ScanParams, ref?: string) => {
  const record = await Effect.runPromise(repo.ensureRepo(params.accountId, params.repo));
  await Effect.runPromise(repo.create({ ...params, ref }, record.id, STALE_AFTER()));
  return record;
};

const usage = { inputTokens: 10, outputTokens: 20, cacheReadTokens: 30, cacheWriteTokens: 40, costUsd: 0.1234, turns: 5, durationMs: 9000 };

describe("neonScanRepo", () => {
  it("creates a queued scan that get returns", async () => {
    const repo = neonScanRepo(test.http);
    await queue(repo, paramsFor(acme, "a-create"));

    expect(await Effect.runPromise(repo.get(acme, "a-create"))).toMatchObject({
      scanId: "a-create",
      accountId: acme,
      status: "queued",
      step: null,
      maxBudgetUsd: 1,
      files: null,
      usage: null,
    });
  });

  it("moves through a step to a final state, with usage", async () => {
    const repo = neonScanRepo(test.http);
    await queue(repo, paramsFor(acme, "a-flow"));
    await Effect.runPromise(repo.mark(acme, "a-flow", { status: "running", step: "auditing" }));
    expect(await Effect.runPromise(repo.get(acme, "a-flow"))).toMatchObject({ status: "running", step: "auditing", finishedAt: null });

    await Effect.runPromise(repo.mark(acme, "a-flow", { status: "succeeded", error: null, usage }));
    const done = await Effect.runPromise(repo.get(acme, "a-flow"));

    expect(done).toMatchObject({ status: "succeeded", step: null, usage });
    expect(done?.finishedAt).not.toBeNull();
  });

  it("keeps the error of a failed scan", async () => {
    const repo = neonScanRepo(test.http);
    await queue(repo, paramsFor(acme, "a-fail"));
    await Effect.runPromise(repo.mark(acme, "a-fail", { status: "failed", error: "boom" }));

    expect(await Effect.runPromise(repo.get(acme, "a-fail"))).toMatchObject({ status: "failed", error: "boom", usage: null });
  });

  it("lists the files a scan saved, by name, and finds each by name", async () => {
    const repo = neonScanRepo(test.http);
    await queue(repo, paramsFor(acme, "a-files"));
    await Effect.runPromise(
      repo.addFiles(acme, "a-files", [
        { name: "findings.json", r2Key: "k/findings.json", sizeBytes: 5, contentType: "application/json" },
        { name: "REPORT.md", r2Key: "k/REPORT.md", sizeBytes: 7, contentType: "text/markdown; charset=utf-8" },
      ]),
    );
    const scan = await Effect.runPromise(repo.get(acme, "a-files"));

    expect(scan?.files).toEqual(["REPORT.md", "findings.json"]);
    expect(scan?.artifacts?.[0]).toEqual({ name: "REPORT.md", sizeBytes: 7, contentType: "text/markdown; charset=utf-8" });
    expect(await Effect.runPromise(repo.file(acme, "a-files", "REPORT.md"))).toEqual({ r2Key: "k/REPORT.md", contentType: "text/markdown; charset=utf-8" });
    expect(await Effect.runPromise(repo.file(acme, "a-files", "missing.md"))).toBeNull();
  });

  it("saving the same file twice updates it, not duplicates it", async () => {
    const repo = neonScanRepo(test.http);
    await queue(repo, paramsFor(acme, "a-twice"));
    const file = { name: "REPORT.md", r2Key: "k/twice", sizeBytes: 1, contentType: "text/markdown; charset=utf-8" };
    await Effect.runPromise(repo.addFiles(acme, "a-twice", [file]));
    await Effect.runPromise(repo.addFiles(acme, "a-twice", [{ ...file, sizeBytes: 9 }]));

    expect((await Effect.runPromise(repo.get(acme, "a-twice")))?.artifacts).toEqual([{ name: "REPORT.md", sizeBytes: 9, contentType: "text/markdown; charset=utf-8" }]);
  });

  it("shows nothing of another account", async () => {
    const repo = neonScanRepo(test.http);
    await queue(repo, paramsFor(other, "o-private"));
    await Effect.runPromise(repo.addFiles(other, "o-private", [{ name: "REPORT.md", r2Key: "k/o", sizeBytes: 1, contentType: "text/markdown; charset=utf-8" }]));

    expect(await Effect.runPromise(repo.get(acme, "o-private"))).toBeNull();
    expect(await Effect.runPromise(repo.file(acme, "o-private", "REPORT.md"))).toBeNull();
    expect((await Effect.runPromise(repo.list(acme, 100))).scans.map((scan) => scan.scanId)).not.toContain("o-private");
  });

  it("pages by scan id, in ascending (newest first) order", async () => {
    const repo = neonScanRepo(test.http);
    for (const id of ["p-1", "p-2", "p-3"]) await queue(repo, paramsFor(other, id));
    const first = await Effect.runPromise(repo.list(other, 2));
    const second = await Effect.runPromise(repo.list(other, 2, first.nextCursor ?? undefined));

    expect(first.scans.map((scan) => scan.scanId)).toEqual(["o-private", "p-1"]);
    expect(first.nextCursor).toBe("p-1");
    expect(second.scans.map((scan) => scan.scanId)).toEqual(["p-2", "p-3"]);
    expect(second.nextCursor).toBeNull();
  });

  it("counts only queued or running scans updated since the cutoff as active", async () => {
    const repo = neonScanRepo(test.http);
    await queue(repo, paramsFor(acme, "act-1"));
    await Effect.runPromise(repo.mark(acme, "act-1", { status: "running" }));
    const active = (await Effect.runPromise(repo.activeSince(acme, Date.now() - 60_000))).map((scan) => scan.scanId);

    expect(active).toContain("act-1");
    expect(active).not.toContain("a-flow");
    expect(await Effect.runPromise(repo.activeSince(acme, Date.now() + 60_000))).toEqual([]);
  });

  it("keeps one record for a repo however its URL is spelled, per account", async () => {
    const repo = neonScanRepo(test.http);
    const first = await Effect.runPromise(repo.ensureRepo(acme, "https://github.com/Octocat/Spoon-Knife"));
    const again = await Effect.runPromise(repo.ensureRepo(acme, "https://github.com/octocat/spoon-knife.git/"));
    const theirs = await Effect.runPromise(repo.ensureRepo(other, "https://github.com/octocat/spoon-knife"));

    expect(again.id).toBe(first.id);
    expect(first).toMatchObject({ canonical: "octocat/spoon-knife", url: "https://github.com/Octocat/Spoon-Knife" });
    expect(theirs.id).not.toBe(first.id);
  });

  it("refuses a second active scan of one repo, names the running one, and lets a finished repo be scanned again", async () => {
    const repo = neonScanRepo(test.http);
    const record = await queue(repo, { ...paramsFor(acme, "dup-1"), repo: "https://github.com/octocat/dup" });

    const error = await Effect.runPromise(Effect.flip(repo.create(paramsFor(acme, "dup-2"), record.id, STALE_AFTER())));
    expect(error).toMatchObject({ _tag: "Conflict", message: "This repo already has an active scan: dup-1" });
    expect(await Effect.runPromise(repo.get(acme, "dup-2"))).toBeNull();

    await Effect.runPromise(repo.mark(acme, "dup-1", { status: "succeeded", error: null }));
    await Effect.runPromise(repo.create(paramsFor(acme, "dup-3"), record.id, STALE_AFTER()));
    expect(await Effect.runPromise(repo.get(acme, "dup-3"))).toMatchObject({ status: "queued", repoId: record.id });
  });

  it("closes a scan that stalled so the repo is not blocked for ever", async () => {
    const repo = neonScanRepo(test.http);
    const record = await queue(repo, { ...paramsFor(acme, "stall-1"), repo: "https://github.com/octocat/stall" });

    await Effect.runPromise(repo.create(paramsFor(acme, "stall-2"), record.id, Date.now() + 60_000));

    expect(await Effect.runPromise(repo.get(acme, "stall-1"))).toMatchObject({ status: "failed", step: null });
    expect(await Effect.runPromise(repo.get(acme, "stall-2"))).toMatchObject({ status: "queued" });
  });

  it("keeps the requested ref and the commit that was read", async () => {
    const repo = neonScanRepo(test.http);
    await queue(repo, paramsFor(acme, "sha-1"), "release/1.2");
    await Effect.runPromise(repo.mark(acme, "sha-1", { commitSha: "7fd1a60b01f91b314f59955a4e4d4e80d8edf11d" }));

    expect(await Effect.runPromise(repo.get(acme, "sha-1"))).toMatchObject({ ref: "release/1.2", commitSha: "7fd1a60b01f91b314f59955a4e4d4e80d8edf11d" });
  });

  it("lists the scans of one repo, or those in one state", async () => {
    const repo = neonScanRepo(test.http);
    const record = await queue(repo, { ...paramsFor(acme, "hist-1"), repo: "https://github.com/octocat/hist" });
    await Effect.runPromise(repo.mark(acme, "hist-1", { status: "succeeded", error: null }));
    await Effect.runPromise(repo.create(paramsFor(acme, "hist-2"), record.id, STALE_AFTER()));

    const ofRepo = await Effect.runPromise(repo.list(acme, 50, undefined, { repoId: record.id }));
    const done = await Effect.runPromise(repo.list(acme, 50, undefined, { repoId: record.id, status: "succeeded" }));

    expect(ofRepo.scans.map((scan) => scan.scanId)).toEqual(["hist-1", "hist-2"]);
    expect(done.scans.map((scan) => scan.scanId)).toEqual(["hist-1"]);
  });

  it("sums what a finished lite scan found, and gives no summary to a scan that was not read", async () => {
    const repo = neonScanRepo(test.http);
    await queue(repo, paramsFor(acme, "sum-lite"));
    await queue(repo, { ...paramsFor(acme, "sum-full"), options: { ...paramsFor(acme, "x").options, skill: "full" } });
    await queue(repo, paramsFor(acme, "sum-running"));
    for (const id of ["sum-lite", "sum-full"]) await Effect.runPromise(repo.mark(acme, id, { status: "succeeded", error: null }));
    await test.raw.insert(scanFindings).values([
      { tenantId: acme, scanId: "sum-lite", findingId: "F-1", fingerprint: "a".repeat(64), status: "confirmed", severity: "high", title: "t", class: "c", origin: "new" },
      { tenantId: acme, scanId: "sum-lite", findingId: "F-2", fingerprint: "b".repeat(64), status: "confirmed", severity: "high", title: "t", class: "c", origin: "carried" },
      { tenantId: acme, scanId: "sum-lite", findingId: "F-3", fingerprint: "c".repeat(64), status: "needs_validation", severity: null, title: "t", class: "c", origin: "new" },
    ]);

    expect((await Effect.runPromise(repo.get(acme, "sum-lite")))?.summary).toEqual({
      total: 3,
      severity: { critical: 0, high: 2, medium: 0, low: 0, informational: 0 },
      needsValidation: 1,
      new: 2,
      carried: 1,
      recheck: null,
    });
    expect((await Effect.runPromise(repo.get(acme, "sum-full")))?.summary).toBeNull();
    expect((await Effect.runPromise(repo.get(acme, "sum-running")))?.summary).toBeNull();
  });

  it("keeps a scan that was closed as failed from being brought back by a slow workflow", async () => {
    const repo = neonScanRepo(test.http);
    const record = await queue(repo, { ...paramsFor(acme, "late-1"), repo: "https://github.com/octocat/late" });
    await Effect.runPromise(repo.create(paramsFor(acme, "late-2"), record.id, Date.now() + 60_000));

    await Effect.runPromise(repo.mark(acme, "late-1", { status: "succeeded", error: null, usage }));
    await Effect.runPromise(repo.mark(acme, "late-1", { step: "saving" }));
    expect(await Effect.runPromise(repo.get(acme, "late-1"))).toMatchObject({ status: "failed", step: null, usage: null });

    await Effect.runPromise(repo.mark(acme, "late-1", { status: "failed", error: "the agent timed out" }));
    expect(await Effect.runPromise(repo.get(acme, "late-1"))).toMatchObject({ status: "failed", error: "the agent timed out" });
  });
});
