import { describe, expect, it } from "vitest";
import { scanBranchScans } from "#/modules/scan/utils/scan-branch-scans";

const scan = (scanId: string, branchId: string | null, createdAt: string) => ({ scanId, branchId, createdAt });

describe("scanBranchScans", () => {
  const history = [
    scan("a", "b1", "2026-11-01T09:00:00.000Z"),
    scan("b", "b2", "2026-11-02T09:00:00.000Z"),
    scan("c", "b1", "2026-11-03T09:00:00.000Z"),
    scan("d", null, "2026-11-04T09:00:00.000Z"),
    scan("e", "b1", "2026-11-05T09:00:00.000Z"),
  ];

  it("lists only the scans of the same branch, newest first, the scan itself included", () => {
    const { scans, more } = scanBranchScans(history, scan("c", "b1", "2026-11-03T09:00:00.000Z"), 5);

    expect(scans.map((item) => item.scanId)).toEqual(["e", "c", "a"]);
    expect(more).toBe(0);
  });

  it("keeps the newest few and says how many did not fit", () => {
    const { scans, more } = scanBranchScans(history, scan("e", "b1", "2026-11-05T09:00:00.000Z"), 2);

    expect(scans.map((item) => item.scanId)).toEqual(["e", "c"]);
    expect(more).toBe(1);
  });

  it("gives a scan with no branch nothing to list, because a one-off scan has no branch history", () => {
    expect(scanBranchScans(history, scan("d", null, "2026-11-04T09:00:00.000Z"), 5)).toEqual({ scans: [], more: 0 });
  });

  it("breaks a tie on the same second by id, so the order never flickers", () => {
    const tied = [scan("x1", "b1", "2026-11-06T09:00:00.000Z"), scan("x2", "b1", "2026-11-06T09:00:00.000Z")];

    expect(scanBranchScans(tied, tied[0] ?? scan("x1", "b1", "2026-11-06T09:00:00.000Z"), 5).scans.map((item) => item.scanId)).toEqual(["x2", "x1"]);
  });
});
