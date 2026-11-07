import { queryOptions } from "@tanstack/react-query";
import { fetchOverview, fetchScan, fetchScanFile, fetchScanFindings, fetchScans } from "../api";
import type { ScanState } from "../schemas";

export const scanKeys = {
  all: ["scans"] as const,
  list: () => [...scanKeys.all, "list"] as const,
  detail: (scanId: string) => [...scanKeys.all, "detail", scanId] as const,
  overview: () => [...scanKeys.all, "overview"] as const,
  findings: (scanId: string) => [...scanKeys.detail(scanId), "findings"] as const,
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
