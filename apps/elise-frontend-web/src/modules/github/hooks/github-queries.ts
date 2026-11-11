import { queryOptions } from "@tanstack/react-query";
import { fetchGithubBranches, fetchGithubInstallations, fetchGithubRepos } from "../api";

export const githubKeys = {
  all: ["github"] as const,
  installations: () => [...githubKeys.all, "installations"] as const,
  repos: () => [...githubKeys.all, "repos"] as const,
  branches: (installationId: string, repo: string) => [...githubKeys.all, "branches", installationId, repo] as const,
};

export const githubInstallationsQuery = () => queryOptions({ queryKey: githubKeys.installations(), queryFn: () => fetchGithubInstallations() });

// -----
// A branch list can change at any push, so it is kept a minute and then read again.
// A repo the connection cannot see answers 404, which a retry would not fix.
// -----
export const githubBranchesQuery = (installationId: string, repo: string) =>
  queryOptions({
    queryKey: githubKeys.branches(installationId, repo),
    queryFn: () => fetchGithubBranches({ data: { installationId, repo } }),
    staleTime: 60_000,
    retry: false,
  });

export const githubReposQuery = () => queryOptions({ queryKey: githubKeys.repos(), queryFn: () => fetchGithubRepos(), staleTime: 60_000 });
