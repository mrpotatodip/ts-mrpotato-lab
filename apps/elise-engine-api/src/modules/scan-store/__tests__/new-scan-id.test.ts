import { afterEach, describe, expect, it, vi } from "vitest";
import { newScanId, scanKey } from "#/modules/scan-store";

afterEach(() => vi.useRealTimers());

describe("newScanId", () => {
  it("sorts a newer ID before an older one", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-07T00:00:00Z"));
    const older = newScanId();
    vi.setSystemTime(new Date("2026-11-07T00:00:01Z"));
    const newer = newScanId();

    expect([older, newer].toSorted()).toEqual([newer, older]);
  });

  it("is a different ID each time, even in the same millisecond", () => {
    expect(newScanId()).not.toBe(newScanId());
  });
});

describe("scanKey", () => {
  it("puts every file under its account", () => {
    expect(scanKey("acme", "abc", "REPORT.md")).toBe("accounts/acme/scans/abc/REPORT.md");
  });
});
