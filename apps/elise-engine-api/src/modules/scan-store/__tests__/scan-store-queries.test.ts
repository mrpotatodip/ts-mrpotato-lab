import { Cause, Effect, Exit } from "effect";
import { describe, expect, it } from "vitest";
import { fakeBindings } from "#/__tests__/fake-bindings";
import type { ScanParams } from "#/schemas";
import {
  listScanStatusesEffect,
  readScanFileEffect,
  readScanStatusEffect,
  saveScanFilesEffect,
  writeScanStatusEffect,
} from "#/modules/scan-store";

const params: ScanParams = {
  scanId: "abc",
  accountId: "acme",
  repo: "https://github.com/octocat/Hello-World",
  options: { skill: "lite", model: "claude-haiku-5-5", effort: "low", profile: "quick", maxBudgetUsd: 1 },
  createdAt: "2026-11-07T00:00:00.000Z",
};

const down = async () => {
  throw new Error("r2 down");
};

// SAFETY: the effect under test calls only the methods listed here.
const brokenReports = { get: down, put: down, list: down } as never;
const reportsOf = () => fakeBindings().env;

describe("scan status", () => {
  it("writes then reads a status", async () => {
    const reports = reportsOf().REPORTS;
    await Effect.runPromise(writeScanStatusEffect(reports, params, "running"));
    const status = await Effect.runPromise(readScanStatusEffect(reports, "acme", "abc"));

    expect(status).toMatchObject({ scanId: "abc", status: "running", finishedAt: null });
  });

  it("sets finishedAt only for a final status", async () => {
    const reports = reportsOf().REPORTS;
    await Effect.runPromise(writeScanStatusEffect(reports, params, "failed", { error: "boom" }));
    const status = await Effect.runPromise(readScanStatusEffect(reports, "acme", "abc"));

    expect(status?.finishedAt).not.toBeNull();
    expect(status?.error).toBe("boom");
  });

  it("returns null for a scan that does not exist", async () => {
    expect(await Effect.runPromise(readScanStatusEffect(reportsOf().REPORTS, "acme", "none"))).toBeNull();
  });

  it("fails with ExternalError when storage rejects", async () => {
    const error = await Effect.runPromise(Effect.flip(readScanStatusEffect(brokenReports, "acme", "abc")));

    expect(error._tag).toBe("ExternalError");
  });

  it("dies, and does not fail, when a stored status is corrupt", async () => {
    const { env, store } = fakeBindings();
    store.set("accounts/acme/scans/abc/status.json", JSON.stringify({ scanId: 1 }));
    const exit = await Effect.runPromiseExit(readScanStatusEffect(env.REPORTS, "acme", "abc"));

    expect(Exit.isFailure(exit) && Cause.isDie(exit.cause)).toBe(true);
  });
});

describe("listScanStatusesEffect", () => {
  it("fails with ExternalError when the listing rejects", async () => {
    const error = await Effect.runPromise(Effect.flip(listScanStatusesEffect(brokenReports, "acme", 50)));

    expect(error._tag).toBe("ExternalError");
  });

  it("pages with a cursor", async () => {
    const reports = reportsOf().REPORTS;
    for (const id of ["a", "b", "c"]) {
      await Effect.runPromise(writeScanStatusEffect(reports, { ...params, scanId: id }, "queued"));
    }
    const first = await Effect.runPromise(listScanStatusesEffect(reports, "acme", 2));
    const second = await Effect.runPromise(listScanStatusesEffect(reports, "acme", 2, first.nextCursor ?? undefined));

    expect(first.scans.map((scan) => scan.scanId)).toEqual(["a", "b"]);
    expect(second.scans.map((scan) => scan.scanId)).toEqual(["c"]);
    expect(second.nextCursor).toBeNull();
  });
});

describe("files", () => {
  it("saves files and returns their names", async () => {
    const reports = reportsOf().REPORTS;
    const names = await Effect.runPromise(saveScanFilesEffect(reports, "acme", "abc", { "REPORT.md": "# r", "findings.json": "[]" }));
    const file = await Effect.runPromise(readScanFileEffect(reports, "acme", "abc", "REPORT.md"));

    expect(names.toSorted()).toEqual(["REPORT.md", "findings.json"]);
    expect(file).not.toBeNull();
  });

  it("fails with ExternalError when a save rejects", async () => {
    const error = await Effect.runPromise(Effect.flip(saveScanFilesEffect(brokenReports, "acme", "abc", { "REPORT.md": "# r" })));

    expect(error._tag).toBe("ExternalError");
  });
});
