import { queryOptions } from "@tanstack/react-query";
import { fetchOverview, fetchScan, fetchScanRepoBranches, fetchScanRepos, fetchScanDiff, fetchScanFile, fetchScanFindings, fetchScans, fetchVerdict } from "../api";
import type { ScanState } from "../schemas";

export const scanKeys = {
  all: ["scans"] as const,
  list: () => [...scanKeys.all, "list"] as const,
  detail: (scanId: string) => [...scanKeys.all, "detail", scanId] as const,
  repos: () => [...scanKeys.all, "repos"] as const,
  repoBranches: (repoId: string) => [...scanKeys.all, "repo-branches", repoId] as const,
  overview: () => [...scanKeys.all, "overview"] as const,
  findings: (scanId: string) => [...scanKeys.detail(scanId), "findings"] as const,
  diff: (scanId: string) => [...scanKeys.detail(scanId), "diff"] as const,
  verdict: (repoId: string, commit: string) => [...scanKeys.all, "verdict", repoId, commit] as const,
  file: (scanId: string, file: string) => [...scanKeys.detail(scanId), file] as const,
};

const POLL_MS = 5000;

export const isScanActive = (status: ScanState) => status === "queued" || status === "running";

export const scansQuery = () =>
  queryOptions({
    queryKey: scanKeys.list(),
    queryFn: () => fetchScans({ data: {} }),
    refetchInterval: (query) => (query.state.data?.scans.some((s) => isScanActive(s.status)) ? POLL_MS : false),
  });

export const scanQuery = (scanId: string) =>
  queryOptions({
    queryKey: scanKeys.detail(scanId),
    queryFn: () => fetchScan({ data: { scanId } }),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status && isScanActive(status) ? POLL_MS : false;
    },
  });

export const scanFileQuery = (scanId: string, file: string) =>
  queryOptions({
    queryKey: scanKeys.file(scanId, file),
    queryFn: () => fetchScanFile({ data: { scanId, file } }),
    staleTime: Infinity,
    retry: false,
  });

export const overviewQuery = () =>
  queryOptions({
    queryKey: scanKeys.overview(),
    queryFn: () => fetchOverview(),
    refetchInterval: POLL_MS * 6,
  });

export const scanFindingsQuery = (scanId: string) =>
  queryOptions({
    queryKey: scanKeys.findings(scanId),
    queryFn: () => fetchScanFindings({ data: { scanId } }),
    staleTime: Infinity,
  });

export const scanDiffQuery = (scanId: string) =>
  queryOptions({
    queryKey: scanKeys.diff(scanId),
    queryFn: () => fetchScanDiff({ data: { scanId } }),
    staleTime: Infinity,
  });

export const verdictQuery = (repoId: string, commit: string) =>
  queryOptions({
    queryKey: scanKeys.verdict(repoId, commit),
    queryFn: () => fetchVerdict({ data: { repoId, commit } }),
    retry: false,
  });

export const scanReposQuery = () => queryOptions({ queryKey: scanKeys.repos(), queryFn: () => fetchScanRepos() });

export const scanRepoBranchesQuery = (repoId: string) => queryOptions({ queryKey: scanKeys.repoBranches(repoId), queryFn: () => fetchScanRepoBranches({ data: { repoId } }) });
