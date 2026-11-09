import type { Repo } from "../schemas";

const NONE = { critical: 0, high: 0, medium: 0, low: 0, informational: 0 };

// -----
// Four demo repositories that cover the cases the overview has to show: one
// with a finding that came back, one that needs a person, one verified and
// waiting for a decision, and one with nothing open. Fixed values, so the demo
// looks the same on every load.
// -----
export function buildReposPrototype(): Repo[] {
  return [
    {
      id: "00000000-0000-4000-8000-000000000001",
      url: "https://github.com/acme/web",
      canonical: "acme/web",
      defaultBranch: "main",
      branchNames: ["main", "feat/checkout"],
      scans: 12,
      lastScanId: null,
      lastScanStatus: "succeeded",
      lastScanAt: "2026-11-08T10:12:00.000Z",
      open: { total: 6, severity: { ...NONE, high: 1, medium: 3, low: 2 }, needsValidation: 0, regressed: 1, unchecked: 0 },
    },
    {
      id: "00000000-0000-4000-8000-000000000002",
      url: "https://github.com/acme/mobile",
      canonical: "acme/mobile",
      defaultBranch: "main",
      branchNames: ["main"],
      scans: 5,
      lastScanId: null,
      lastScanStatus: "succeeded",
      lastScanAt: "2026-11-07T15:40:00.000Z",
      open: { total: 3, severity: { ...NONE, medium: 2, informational: 1 }, needsValidation: 2, regressed: 0, unchecked: 0 },
    },
    {
      id: "00000000-0000-4000-8000-000000000003",
      url: "https://github.com/acme/api",
      canonical: "acme/api",
      defaultBranch: "main",
      branchNames: ["main", "fix/rate-limit"],
      scans: 9,
      lastScanId: null,
      lastScanStatus: "succeeded",
      lastScanAt: "2026-11-06T09:05:00.000Z",
      open: { total: 2, severity: { ...NONE, low: 2 }, needsValidation: 0, regressed: 0, unchecked: 0 },
    },
    {
      id: "00000000-0000-4000-8000-000000000004",
      url: "https://github.com/acme/docs",
      canonical: "acme/docs",
      defaultBranch: "main",
      branchNames: ["main"],
      scans: 3,
      lastScanId: null,
      lastScanStatus: "succeeded",
      lastScanAt: "2026-11-04T18:20:00.000Z",
      open: { total: 0, severity: NONE, needsValidation: 0, regressed: 0, unchecked: 0 },
    },
  ];
}
