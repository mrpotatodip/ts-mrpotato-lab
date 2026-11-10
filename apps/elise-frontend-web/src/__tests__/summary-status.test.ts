import { describe, expect, it } from "vitest";
import { findingStateLabel, openFindings, repoStatus } from "#/modules/summary/utils/summary-status";

const open = (total: number) => ({ total, severity: { critical: 0, high: 0, medium: 0, low: 0, informational: 0 }, needsValidation: 0, regressed: 0, unchecked: 0 });

describe("repoStatus", () => {
  it.each([
    { name: "no default branch scanned yet", repo: { defaultBranch: null, open: open(0) }, expected: "not_scanned" },
    { name: "a branch with nothing open", repo: { defaultBranch: "main", open: open(0) }, expected: "clear" },
    { name: "a branch with one open finding", repo: { defaultBranch: "main", open: open(1) }, expected: "attention" },
  ])("is $expected for $name", ({ repo, expected }) => {
    expect(repoStatus(repo)).toBe(expected);
  });
});

describe("findingStateLabel", () => {
  it.each([
    { name: "a confirmed finding", finding: { state: "open", status: "confirmed" }, expected: "Confirmed" },
    { name: "a finding that needs a person", finding: { state: "open", status: "needs_validation" }, expected: "Needs a person to check" },
    { name: "a finding that came back", finding: { state: "regressed", status: "confirmed" }, expected: "Came back" },
    { name: "a finding that came back and needs a person", finding: { state: "regressed", status: "needs_validation" }, expected: "Came back" },
  ] as const)("says $expected for $name", ({ finding, expected }) => {
    expect(findingStateLabel(finding)).toBe(expected);
  });
});

describe("openFindings", () => {
  it("drops the findings a scan has already closed and keeps the rest in order", () => {
    const findings = [{ id: "a", state: "open" }, { id: "b", state: "fixed_by_code" }, { id: "c", state: "regressed" }] as const;

    expect(openFindings(findings).map((finding) => finding.id)).toEqual(["a", "c"]);
  });
});
