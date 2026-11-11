import { describe, expect, it } from "vitest";
import type { Repo } from "#/modules/scan/schemas";
import { scanKnownRepos, scanRepoChoices } from "#/modules/scan/utils/scan-known-repos";

const repo = (id: string, canonical: string, isPrivate: boolean | null | undefined): Repo => ({
  id,
  url: `https://github.com/${canonical}`,
  canonical,
  isPrivate,
  defaultBranch: "main",
  branchNames: ["main"],
  scans: 1,
  lastScanId: null,
  lastScanStatus: "succeeded",
  lastScanAt: "2026-11-10T09:00:00.000Z",
  open: { total: 0, severity: { critical: 0, high: 0, medium: 0, low: 0, informational: 0 }, needsValidation: 0, regressed: 0, unchecked: 0 },
});

describe("scanRepoChoices", () => {
  it("marks a repository private only when the engine said so, so the public list can hide it", () => {
    const choices = scanRepoChoices(
      [
        repo("a0000000-0000-4000-8000-000000000001", "octo/closed", true),
        repo("a0000000-0000-4000-8000-000000000002", "octo/open", false),
        repo("a0000000-0000-4000-8000-000000000003", "octo/unknown", null),
        repo("a0000000-0000-4000-8000-000000000004", "octo/older-engine", undefined),
      ],
      [],
    );

    expect(Object.fromEntries(choices.map((choice) => [choice.label, choice.isPrivate]))).toEqual({
      "octo/closed": true,
      "octo/open": false,
      "octo/unknown": false,
      "octo/older-engine": false,
    });
  });
});

describe("scanKnownRepos", () => {
  it("never calls a repository private, because a scan does not say", () => {
    expect(scanKnownRepos([]).every((item) => item.isPrivate === false)).toBe(true);
  });
});
