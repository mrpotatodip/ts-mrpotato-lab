import { Effect } from "effect";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
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
  repo: "https://github.com/octocat/Hello-World",
  options: { skill: "lite", model: "claude-haiku-5-5", effort: "low", profile: "quick", maxBudgetUsd: 1 },
  createdAt: new Date().toISOString(),
});

const usage = { inputTokens: 10, outputTokens: 20, cacheReadTokens: 30, cacheWriteTokens: 40, costUsd: 0.1234, turns: 5, durationMs: 9000 };

describe("neonScanRepo", () => {
  it("creates a queued scan that get returns", async () => {
    const repo = neonScanRepo(test.http);
    await Effect.runPromise(repo.create(paramsFor(acme, "a-create")));

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
    await Effect.runPromise(repo.create(paramsFor(acme, "a-flow")));
    await Effect.runPromise(repo.mark(acme, "a-flow", { status: "running", step: "auditing" }));
    expect(await Effect.runPromise(repo.get(acme, "a-flow"))).toMatchObject({ status: "running", step: "auditing", finishedAt: null });

    await Effect.runPromise(repo.mark(acme, "a-flow", { status: "succeeded", error: null, usage }));
    const done = await Effect.runPromise(repo.get(acme, "a-flow"));

    expect(done).toMatchObject({ status: "succeeded", step: null, usage });
    expect(done?.finishedAt).not.toBeNull();
  });

  it("keeps the error of a failed scan", async () => {
    const repo = neonScanRepo(test.http);
    await Effect.runPromise(repo.create(paramsFor(acme, "a-fail")));
    await Effect.runPromise(repo.mark(acme, "a-fail", { status: "failed", error: "boom" }));

    expect(await Effect.runPromise(repo.get(acme, "a-fail"))).toMatchObject({ status: "failed", error: "boom", usage: null });
  });

  it("lists the files a scan saved, by name, and finds each by name", async () => {
    const repo = neonScanRepo(test.http);
    await Effect.runPromise(repo.create(paramsFor(acme, "a-files")));
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
    await Effect.runPromise(repo.create(paramsFor(acme, "a-twice")));
    const file = { name: "REPORT.md", r2Key: "k/twice", sizeBytes: 1, contentType: "text/markdown; charset=utf-8" };
    await Effect.runPromise(repo.addFiles(acme, "a-twice", [file]));
    await Effect.runPromise(repo.addFiles(acme, "a-twice", [{ ...file, sizeBytes: 9 }]));

    expect((await Effect.runPromise(repo.get(acme, "a-twice")))?.artifacts).toEqual([{ name: "REPORT.md", sizeBytes: 9, contentType: "text/markdown; charset=utf-8" }]);
  });

  it("shows nothing of another account", async () => {
    const repo = neonScanRepo(test.http);
    await Effect.runPromise(repo.create(paramsFor(other, "o-private")));
    await Effect.runPromise(repo.addFiles(other, "o-private", [{ name: "REPORT.md", r2Key: "k/o", sizeBytes: 1, contentType: "text/markdown; charset=utf-8" }]));

    expect(await Effect.runPromise(repo.get(acme, "o-private"))).toBeNull();
    expect(await Effect.runPromise(repo.file(acme, "o-private", "REPORT.md"))).toBeNull();
    expect((await Effect.runPromise(repo.list(acme, 100))).scans.map((scan) => scan.scanId)).not.toContain("o-private");
  });

  it("pages by scan id, in ascending (newest first) order", async () => {
    const repo = neonScanRepo(test.http);
    for (const id of ["p-1", "p-2", "p-3"]) await Effect.runPromise(repo.create(paramsFor(other, id)));
    const first = await Effect.runPromise(repo.list(other, 2));
    const second = await Effect.runPromise(repo.list(other, 2, first.nextCursor ?? undefined));

    expect(first.scans.map((scan) => scan.scanId)).toEqual(["o-private", "p-1"]);
    expect(first.nextCursor).toBe("p-1");
    expect(second.scans.map((scan) => scan.scanId)).toEqual(["p-2", "p-3"]);
    expect(second.nextCursor).toBeNull();
  });

  it("counts only queued or running scans updated since the cutoff as active", async () => {
    const repo = neonScanRepo(test.http);
    await Effect.runPromise(repo.create(paramsFor(acme, "act-1")));
    await Effect.runPromise(repo.mark(acme, "act-1", { status: "running" }));
    const active = (await Effect.runPromise(repo.activeSince(acme, Date.now() - 60_000))).map((scan) => scan.scanId);

    expect(active).toContain("act-1");
    expect(active).not.toContain("a-flow");
    expect(await Effect.runPromise(repo.activeSince(acme, Date.now() + 60_000))).toEqual([]);
  });
});
