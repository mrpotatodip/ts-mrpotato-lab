import { createServerFn } from "@tanstack/react-start";
import {
  CreateScanInputSchema,
  FindingListSchema,
  FindingsFileSchema,
  RepoDetailSchema,
  RepoListSchema,
  RepoParamSchema,
  SEVERITIES,
  fromRecorded,
  type Finding,
  OverviewSchema,
  type Severity,
  ScanQueuedSchema,
  ScanCursorInputSchema,
  ScanDiffSchema,
  ScanFileInputSchema,
  ScanIdInputSchema,
  ScanListSchema,
  ScanStatusSchema,
  VerdictInputSchema,
  VerdictSchema,
} from "../schemas";
import { EngineError, engineFetch, engineJson, jsonPost, type EngineAuth } from "#/lib/engine-client";
import { engineAuth } from "#/modules/auth/server/session";

export const fetchScans = createServerFn({ method: "GET" })
  .validator(ScanCursorInputSchema)
  .handler(async ({ data }) => {
    const query = data.cursor ? `?cursor=${encodeURIComponent(data.cursor)}` : "";
    return engineJson(ScanListSchema, `/scans${query}`, {}, await engineAuth());
  });

export const fetchScanRepos = createServerFn({ method: "GET" }).handler(async () => engineJson(RepoListSchema, "/repos", {}, await engineAuth()));

export const fetchScanRepoBranches = createServerFn({ method: "GET" })
  .validator(RepoParamSchema)
  .handler(async ({ data }) => engineJson(RepoDetailSchema, `/repos/${data.repoId}`, {}, await engineAuth()));

export const fetchScan = createServerFn({ method: "GET" })
  .validator(ScanIdInputSchema)
  .handler(async ({ data }) => {
    return engineJson(ScanStatusSchema, `/scans/${data.scanId}`, {}, await engineAuth());
  });

export const fetchScanFile = createServerFn({ method: "GET" })
  .validator(ScanFileInputSchema)
  .handler(async ({ data }) => {
    const res = await engineFetch(`/scans/${data.scanId}/files/${data.file}`, {}, await engineAuth());
    return res.text();
  });

export const createScan = createServerFn({ method: "POST" })
  .validator(CreateScanInputSchema)
  .handler(async ({ data }) => {
    // -----
    // The engine names it runner_id, like max_budget_usd.
    // -----
    const { runnerId, ...scan } = data;
    return engineJson(ScanQueuedSchema, "/scans", jsonPost(JSON.stringify({ ...scan, runner_id: runnerId })), await engineAuth());
  });

const RECORDED_PAGE = 100;

// -----
// Lite scans record their findings in Neon; the full skill does not, so
// its findings.json is the only source. A missing file means nothing was
// saved. Any other failure is raised, not shown as "No findings".
// -----
async function readFindings(auth: EngineAuth, scanId: string): Promise<Finding[]> {
  const recorded = await engineJson(FindingListSchema, `/findings?scanId=${encodeURIComponent(scanId)}&limit=${RECORDED_PAGE}`, {}, auth);
  if (recorded.findings.length > 0) return recorded.findings.map(fromRecorded);
  try {
    const res = await engineFetch(`/scans/${scanId}/files/findings.json`, {}, auth);
    return FindingsFileSchema.parse(await res.json());
  } catch (error) {
    if (error instanceof EngineError && error.status === 404) return [];
    throw error;
  }
}

export const fetchScanFindings = createServerFn({ method: "GET" })
  .validator(ScanIdInputSchema)
  .handler(async ({ data }) => {
    return readFindings(await engineAuth(), data.scanId);
  });

// -----
// Scan counts come from the newest page of scans. Open findings come from
// the repo list, which counts every repo's open findings exactly.
// -----
export const fetchOverview = createServerFn({ method: "GET" }).handler(async () => {
  const auth = await engineAuth();
  const [list, repoList] = await Promise.all([engineJson(ScanListSchema, "/scans", {}, auth), engineJson(RepoListSchema, "/repos", {}, auth)]);

  const byState = { queued: 0, running: 0, succeeded: 0, failed: 0 };
  for (const scan of list.scans) byState[scan.status] += 1;

  const severity = { critical: 0, high: 0, medium: 0, low: 0, informational: 0 } satisfies Record<Severity, number>;
  let needsValidation = 0;
  for (const { open } of repoList.repos) {
    needsValidation += open.needsValidation;
    for (const key of SEVERITIES) severity[key] += open.severity[key];
  }

  return OverviewSchema.parse({
    total: list.scans.length,
    hasMore: list.nextCursor !== null,
    byState,
    severity,
    needsValidation,
    repos: repoList.repos.length,
  });
});

export const fetchScanDiff = createServerFn({ method: "GET" })
  .validator(ScanIdInputSchema)
  .handler(async ({ data }) => engineJson(ScanDiffSchema, `/scans/${data.scanId}/diff`, {}, await engineAuth()));

export const fetchVerdict = createServerFn({ method: "GET" })
  .validator(VerdictInputSchema)
  .handler(async ({ data }) => engineJson(VerdictSchema, `/repos/${data.repoId}/verdict?commit=${data.commit}`, {}, await engineAuth()));
