import type { Repo, RepoFinding } from "#/modules/repo";

export type RepoStatus = "clear" | "attention" | "not_scanned";

export const repoStatus = (repo: Pick<Repo, "defaultBranch" | "open">): RepoStatus => {
  if (repo.defaultBranch === null) return "not_scanned";
  return repo.open.total === 0 ? "clear" : "attention";
};

export const REPO_STATUS_BADGE = {
  clear: { label: "Clear", variant: "success" },
  attention: { label: "Needs attention", variant: "warning" },
  not_scanned: { label: "Not scanned yet", variant: "neutral" },
} as const satisfies Record<RepoStatus, { label: string; variant: "success" | "warning" | "neutral" }>;

export const findingStateLabel = (finding: Pick<RepoFinding, "state" | "status">): string => {
  if (finding.state === "regressed") return "Came back";
  return finding.status === "needs_validation" ? "Needs a person to check" : "Confirmed";
};

export const openFindings = <F extends Pick<RepoFinding, "state">>(findings: readonly F[]): F[] => findings.filter((finding) => finding.state !== "fixed_by_code");
