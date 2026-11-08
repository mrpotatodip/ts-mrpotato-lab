import { describe, expect, it } from "vitest";
import { scanActivity } from "#/modules/scan/utils/scan-activity";
import { scanPlanSummary } from "#/modules/scan/utils/scan-plan-summary";
import { scanRepoName } from "#/modules/scan/utils/scan-repo-name";
import { scanSidebarItems } from "#/modules/scan/utils/scan-sidebar";
import { scanSuccessRate } from "#/modules/scan/utils/scan-success-rate";

describe("scanSuccessRate", () => {
  it("is null before any scan finishes", () => {
    expect(scanSuccessRate(0, 0)).toBeNull();
  });

  it("rounds the share of succeeded scans among finished ones", () => {
    expect(scanSuccessRate(19, 3)).toBe(86);
    expect(scanSuccessRate(0, 4)).toBe(0);
  });
});

describe("scanRepoName", () => {
  it("splits a GitHub URL into owner and name", () => {
    expect(scanRepoName("https://github.com/honojs/hono.git", "id")).toEqual({ owner: "honojs", name: "hono" });
  });

  it("falls back to the scan id when the repo is missing", () => {
    expect(scanRepoName(null, "s1")).toEqual({ owner: "", name: "s1" });
  });
});

describe("scanActivity", () => {
  const now = new Date("2026-11-08T12:00:00Z");

  it("returns one bucket per day ending today", () => {
    const days = scanActivity([], 3, now);
    expect(days.map((d) => d.key)).toEqual(["2026-11-06", "2026-11-07", "2026-11-08"]);
  });

  it("counts scans by status and ignores scans outside the window", () => {
    const days = scanActivity(
      [
        { createdAt: "2026-11-08T01:00:00Z", status: "succeeded" },
        { createdAt: "2026-11-08T05:00:00Z", status: "failed" },
        { createdAt: "2026-11-08T06:00:00Z", status: "running" },
        { createdAt: "2026-10-01T06:00:00Z", status: "succeeded" },
      ],
      3,
      now,
    );
    expect(days[2]).toMatchObject({ succeeded: 1, failed: 1, active: 1, total: 3 });
    expect(days.reduce((sum, d) => sum + d.total, 0)).toBe(3);
  });
});

describe("scanSidebarItems", () => {
  const scans = [
    { scanId: "a", repoId: "r1", repo: "https://github.com/acme/api", status: "running" as const },
    { scanId: "b", repoId: "r2", repo: "https://github.com/acme/web", status: "queued" as const },
    { scanId: "c", repoId: "r1", repo: "https://github.com/acme/api", status: "failed" as const },
    { scanId: "d", repoId: "r3", repo: "https://github.com/acme/cli", status: "succeeded" as const },
  ];

  it("lists each repository once, in the order of its newest scan, with that scan's status", () => {
    const { repos, repoCount } = scanSidebarItems(scans);
    expect(repos.map((r) => [r.id, r.name, r.status])).toEqual([
      ["r1", "api", "running"],
      ["r2", "web", "queued"],
      ["r3", "cli", "succeeded"],
    ]);
    expect(repoCount).toBe(3);
  });

  it("counts the scans in progress and all scans", () => {
    const { running, total } = scanSidebarItems(scans);
    expect(running).toBe(2);
    expect(total).toBe(4);
  });

  it("caps the list at five repositories but still counts them all", () => {
    const many = Array.from({ length: 9 }, (_, i) => ({ scanId: `s${i}`, repoId: `r${i}`, repo: `https://github.com/acme/r${i}`, status: "succeeded" as const }));
    const { repos, repoCount } = scanSidebarItems(many);
    expect(repos).toHaveLength(5);
    expect(repoCount).toBe(9);
  });
});

describe("scanPlanSummary", () => {
  const base = { repo: "https://github.com/honojs/hono", model: "claude-sonnet-5-5", effort: "high", skill: "lite", profile: "standard" } as const;

  it("says nothing until the repository link is valid", () => {
    expect(scanPlanSummary({ ...base, repo: "not-a-repo" })).toBeNull();
  });

  it("describes a quick review in plain words", () => {
    expect(scanPlanSummary(base)).toContain("quick review on honojs/hono with Claude Sonnet 5.5");
  });

  it("mentions coverage only for a full audit", () => {
    expect(scanPlanSummary({ ...base, skill: "full", profile: "deep" })).toContain("full audit, exhaustive coverage, on honojs/hono");
    expect(scanPlanSummary(base)).not.toContain("coverage");
  });
});
