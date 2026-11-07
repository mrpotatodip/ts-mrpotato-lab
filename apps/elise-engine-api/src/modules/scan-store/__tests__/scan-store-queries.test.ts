import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { fakeBindings } from "#/__tests__/fake-bindings";
import { readScanFileEffect, saveScanFilesEffect } from "#/modules/scan-store";

const down = async () => {
  throw new Error("r2 down");
};

// SAFETY: the effect under test calls only the methods listed here.
const brokenReports = { get: down, put: down, list: down } as never;
const reportsOf = () => fakeBindings().env;

describe("files", () => {
  it("saves files and says what each one is", async () => {
    const reports = reportsOf().REPORTS;
    const saved = await Effect.runPromise(saveScanFilesEffect(reports, "acme", "abc", { "REPORT.md": "# r", "findings.json": "[]" }));

    expect(saved.toSorted((a, b) => (a.name < b.name ? -1 : 1))).toEqual([
      { name: "REPORT.md", r2Key: "accounts/acme/scans/abc/REPORT.md", sizeBytes: 3, contentType: "text/markdown; charset=utf-8" },
      { name: "findings.json", r2Key: "accounts/acme/scans/abc/findings.json", sizeBytes: 2, contentType: "application/json" },
    ]);
  });

  it("counts bytes, not characters", async () => {
    const saved = await Effect.runPromise(saveScanFilesEffect(reportsOf().REPORTS, "acme", "abc", { "REPORT.md": "é" }));

    expect(saved[0].sizeBytes).toBe(2);
  });

  it("reads back a file by its key", async () => {
    const reports = reportsOf().REPORTS;
    const [file] = await Effect.runPromise(saveScanFilesEffect(reports, "acme", "abc", { "REPORT.md": "# r" }));
    const object = await Effect.runPromise(readScanFileEffect(reports, file.r2Key));

    expect(object).not.toBeNull();
  });

  it("returns null for a key that holds nothing", async () => {
    expect(await Effect.runPromise(readScanFileEffect(reportsOf().REPORTS, "accounts/acme/scans/none/REPORT.md"))).toBeNull();
  });

  it("fails with ExternalError when a save rejects", async () => {
    const error = await Effect.runPromise(Effect.flip(saveScanFilesEffect(brokenReports, "acme", "abc", { "REPORT.md": "# r" })));

    expect(error._tag).toBe("ExternalError");
  });

  it("fails with ExternalError when a read rejects", async () => {
    const error = await Effect.runPromise(Effect.flip(readScanFileEffect(brokenReports, "accounts/acme/scans/abc/REPORT.md")));

    expect(error._tag).toBe("ExternalError");
  });
});
