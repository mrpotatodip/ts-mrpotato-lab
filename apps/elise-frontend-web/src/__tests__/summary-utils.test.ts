import { describe, expect, it } from "vitest";
import { findingAnchor, findingPath, findingWhere, needsPersonLabel, repoSubtitle, scanDayLabel, summaryStanding } from "#/modules/summary/utils/summary-status";

const open = (total: number) => ({ total, severity: { critical: 0, high: 0, medium: 0, low: 0, informational: 0 }, needsValidation: 0, regressed: 0, unchecked: 0 });

describe("needsPersonLabel", () => {
  it.each([
    [1, "1 needs a person"],
    [2, "2 need a person"],
    [11, "11 need a person"],
  ])("writes %s as %s", (count, expected) => {
    expect(needsPersonLabel(count)).toBe(expected);
  });
});

describe("findingPath", () => {
  it("is the repository's address with the finding's anchor, the same one the page scrolls to", () => {
    expect(findingPath("repo-1", "f-9")).toBe(`/summary/repo-1#${findingAnchor("f-9")}`);
  });
});

describe("scanDayLabel", () => {
  it.each([
    ["2026-11-11T23:30:00.000Z", "Nov 11, 2026"],
    ["not a date", "not a date"],
  ])("writes %s as %s", (iso, expected) => {
    expect(scanDayLabel(iso)).toBe(expected);
  });
});

describe("repoSubtitle", () => {
  it.each([
    ["a branch and a scan", { defaultBranch: "main", scans: 3, lastScanAt: "2026-11-11T10:00:00Z" }, "Branch main. Latest scan Nov 11, 2026."],
    ["a branch and no scan time", { defaultBranch: "main", scans: 3, lastScanAt: null }, "Branch main"],
    ["scans but no tracked branch", { defaultBranch: null, scans: 2, lastScanAt: "2026-11-11T10:00:00Z" }, "Latest scan Nov 11, 2026. A scan ran, but no branch is tracked yet, so no findings are listed. Ask a developer to add a branch to track."],
    ["no scan at all", { defaultBranch: null, scans: 0, lastScanAt: null }, "Not scanned yet."],
  ])("for %s says %j", (_name, repo, expected) => {
    expect(repoSubtitle(repo)).toBe(expected);
  });
});

describe("summaryStanding", () => {
  const attention = { defaultBranch: "main", scans: 1, open: open(2) };
  const clear = { defaultBranch: "main", scans: 1, open: open(0) };
  const noBranch = { defaultBranch: null, scans: 2, open: open(0) };

  it.each([
    ["two of three scanned have something open", [attention, attention, clear], "2 of 3 scanned repositories have something still open. The most urgent is first."],
    ["one of one", [attention], "1 of 1 scanned repository has something still open. The most urgent is first."],
    ["nothing open", [clear, clear], "Nothing is open in the 2 scanned repositories."],
    ["a repository with no tracked branch is not counted", [attention, noBranch], "1 of 1 scanned repository has something still open. The most urgent is first."],
    ["no repository with a branch", [noBranch], "No repository has a tracked branch yet, so nothing is listed."],
  ])("says it plainly when %s", (_name, repos, expected) => {
    expect(summaryStanding(repos)).toBe(expected);
  });
});

describe("findingWhere", () => {
  it.each([
    [{ file: "src/forms/update.ts", line: 42 }, "src/forms/update.ts:42"],
    [{ file: "src/forms/update.ts", line: null }, "src/forms/update.ts"],
    [{ file: null, line: 42 }, null],
  ])("writes %j as %j", (finding, expected) => {
    expect(findingWhere(finding)).toBe(expected);
  });
});
