import type { Repo, RepoFinding } from "#/modules/repo";
import { SUMMARY_COPY } from "../constants";

export type RepoStatus = "clear" | "attention" | "no_branch" | "not_scanned";

// -----
// A repository with no default branch is either never scanned, or scanned
// without a branch being tracked (a scan of a pasted commit, say). The
// two are not the same thing, and the second says so.
// -----
export const repoStatus = (repo: Pick<Repo, "defaultBranch" | "open" | "scans">): RepoStatus => {
  if (repo.defaultBranch === null) return repo.scans > 0 ? "no_branch" : "not_scanned";
  return repo.open.total === 0 ? "clear" : "attention";
};

export const REPO_STATUS_BADGE = {
  clear: { label: "Clear", variant: "success" },
  attention: { label: "Needs attention", variant: "warning" },
  no_branch: { label: "No branch tracked", variant: "neutral" },
  not_scanned: { label: "Not scanned yet", variant: "neutral" },
} as const satisfies Record<RepoStatus, { label: string; variant: "success" | "warning" | "neutral" }>;

export const findingStateLabel = (finding: Pick<RepoFinding, "state" | "status">): string => {
  if (finding.state === "regressed") return "Came back";
  return finding.status === "needs_validation" ? "Needs a person to check" : "Confirmed";
};

export const openFindings = <F extends Pick<RepoFinding, "state">>(findings: readonly F[]): F[] => findings.filter((finding) => finding.state !== "fixed_by_code");

// -----
// Findings the agent could not confirm have no severity, so the dots
// leave them out; this says how many there are.
// -----
export const needsPersonLabel = (count: number): string => `${count} ${count === 1 ? "needs" : "need"} a person`;

export const findingAnchor = (findingId: string): string => `finding-${findingId}`;

export const findingPath = (repoId: string, findingId: string): string => `/summary/${repoId}#${findingAnchor(findingId)}`;

const SCAN_DAY = new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });

// -----
// The day of a scan, in UTC like every other time on the dashboard
// before it hydrates. A value that is not a date comes back as it is.
// -----
export const scanDayLabel = (iso: string): string => {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : SCAN_DAY.format(date);
};

// -----
// The line under a repository's name: its branch and when it was last
// scanned, or why there is nothing to list.
// -----
export const repoSubtitle = (repo: Pick<Repo, "defaultBranch" | "scans" | "lastScanAt">): string => {
  const when = repo.lastScanAt ? `Latest scan ${scanDayLabel(repo.lastScanAt)}.` : "";
  if (repo.defaultBranch === null) return repo.scans > 0 ? `${when} ${SUMMARY_COPY.noBranch}`.trim() : SUMMARY_COPY.notScanned;
  return `Branch ${repo.defaultBranch}${repo.lastScanAt ? `. ${when}` : ""}`;
};

// -----
// One sentence on where the workspace stands, for a reader who will not
// add up the rows: how many of the scanned repositories have something
// open. A repository with no tracked branch has nothing to count.
// -----
export const summaryStanding = (repos: readonly Pick<Repo, "defaultBranch" | "open" | "scans">[]): string => {
  const scanned = repos.filter((repo) => repo.defaultBranch !== null);
  if (scanned.length === 0) return "No repository has a tracked branch yet, so nothing is listed.";
  const open = scanned.filter((repo) => repoStatus(repo) === "attention").length;
  const noun = scanned.length === 1 ? "repository" : "repositories";
  if (open === 0) return `Nothing is open in the ${scanned.length} scanned ${noun}.`;
  return `${open} of ${scanned.length} scanned ${noun} ${open === 1 ? "has" : "have"} something still open. The most urgent is first.`;
};

export const findingWhere = (finding: Pick<RepoFinding, "file" | "line">): string | null => {
  if (!finding.file) return null;
  return finding.line === null ? finding.file : `${finding.file}:${finding.line}`;
};
