import type { ScanState } from "../schemas";
import { scanRepoName } from "./scan-repo-name";

type ScanSidebarInput = { scanId: string; repoId?: string | null; repo: string | null | undefined; status: ScanState };

export type ScanSidebarRepo = {
  id: string;
  owner: string;
  name: string;
  status: ScanState;
};

const REPOS = 5;

// -----
// What the sidebar needs from the scans, newest first: the repositories
// scanned most recently (one row each, with the status of its newest scan),
// how many scans are in progress, and the total. Five repositories are
// enough to jump to; the rest are one click away on the Repositories page.
// -----
export function scanSidebarItems(scans: readonly ScanSidebarInput[]) {
  const seen = new Set<string>();
  const repos: ScanSidebarRepo[] = [];
  let running = 0;

  for (const scan of scans) {
    if (scan.status === "running" || scan.status === "queued") running += 1;
    const key = scan.repoId ?? scan.repo ?? scan.scanId;
    if (seen.has(key)) continue;
    seen.add(key);
    repos.push({ id: scan.repoId ?? key, status: scan.status, ...scanRepoName(scan.repo, scan.scanId) });
  }

  return { repos: repos.slice(0, REPOS), repoCount: repos.length, running, total: scans.length };
}
