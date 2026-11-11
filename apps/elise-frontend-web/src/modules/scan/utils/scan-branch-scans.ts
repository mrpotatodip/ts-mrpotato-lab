import type { ScanStatus } from "../schemas";

type BranchScanInput = Pick<ScanStatus, "scanId" | "branchId" | "createdAt">;

// -----
// The newest scans of the branch a scan belongs to, newest first, the
// scan itself included so the table can mark it. A scan with no branch has
// no branch to list, so it gets none. `more` counts the scans that did not
// fit, for the line under the table.
// -----
export function scanBranchScans<T extends BranchScanInput>(history: readonly T[], scan: BranchScanInput, limit: number) {
  const ofBranch: T[] = scan.branchId
    ? history.filter((item) => item.branchId === scan.branchId).toSorted((a, b) => b.createdAt.localeCompare(a.createdAt) || b.scanId.localeCompare(a.scanId))
    : [];
  return { scans: ofBranch.slice(0, limit), more: Math.max(0, ofBranch.length - limit) };
}
