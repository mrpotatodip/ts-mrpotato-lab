import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";
import { fetchRepo, fetchRepoFindings, fetchRepos } from "../api";
import type { RepoFindingsFilter } from "../schemas";

export const repoKeys = {
  all: ["repos"] as const,
  list: () => [...repoKeys.all, "list"] as const,
  detail: (repoId: string) => [...repoKeys.all, "detail", repoId] as const,
  findings: (repoId: string, filter: RepoFindingsFilter) => [...repoKeys.detail(repoId), "findings", filter] as const,
};

export const reposQuery = () => queryOptions({ queryKey: repoKeys.list(), queryFn: () => fetchRepos() });

export const repoQuery = (repoId: string) =>
  queryOptions({
    queryKey: repoKeys.detail(repoId),
    queryFn: () => fetchRepo({ data: { repoId } }),
    refetchInterval: (query) => (query.state.data?.history.some((s) => s.status === "queued" || s.status === "running") ? 5000 : false),
  });

export const repoFindingsQuery = (repoId: string, filter: RepoFindingsFilter = {}) =>
  infiniteQueryOptions({
    queryKey: repoKeys.findings(repoId, filter),
    queryFn: ({ pageParam }) => fetchRepoFindings({ data: { repoId, ...filter, cursor: pageParam === "" ? undefined : pageParam } }),
    initialPageParam: "",
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
