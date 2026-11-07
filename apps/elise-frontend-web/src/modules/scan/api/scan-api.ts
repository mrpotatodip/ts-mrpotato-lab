import { createServerFn } from "@tanstack/react-start";
import {
  CreateScanInputSchema,
  FindingsFileSchema,
  OverviewSchema,
  type Severity,
  ScanQueuedSchema,
  ScanCursorInputSchema,
  ScanFileInputSchema,
  ScanIdInputSchema,
  ScanListSchema,
  ScanStatusSchema,
} from "../schemas";
import { engineFetch, engineJson, jsonPost, type EngineAuth } from "#/lib/engine-client";
import { requireSession } from "#/modules/auth/server/session";

export const fetchScans = createServerFn({ method: "GET" })
  .validator(ScanCursorInputSchema)
  .handler(async ({ data }) => {
    const query = data.cursor ? `?cursor=${encodeURIComponent(data.cursor)}` : "";
    return engineJson(ScanListSchema, `/scans${query}`, {}, await engineAuth());
  });

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
    return engineJson(ScanQueuedSchema, "/scans", jsonPost(JSON.stringify(data)), await engineAuth());
  });

async function engineAuth(): Promise<EngineAuth> {
  const { token, accountId } = await requireSession();
  return { token, accountId };
}

async function readFindings(auth: EngineAuth, scanId: string) {
  try {
    const res = await engineFetch(`/scans/${scanId}/files/findings.json`, {}, auth);
    return FindingsFileSchema.parse(await res.json());
  } catch {
    return [];
  }
}

export const fetchScanFindings = createServerFn({ method: "GET" })
  .validator(ScanIdInputSchema)
  .handler(async ({ data }) => {
    return readFindings(await engineAuth(), data.scanId);
  });

const FINDINGS_SAMPLE = 10;

// -----
// Counts come from the newest page of scans only, and findings from the
// newest FINDINGS_SAMPLE finished ones: the engine has no summary endpoint.
// -----
export const fetchOverview = createServerFn({ method: "GET" }).handler(async () => {
  const auth = await engineAuth();
  const list = await engineJson(ScanListSchema, "/scans", {}, auth);

  const byState = { queued: 0, running: 0, succeeded: 0, failed: 0 };
  for (const scan of list.scans) byState[scan.status] += 1;

  const sampled = list.scans.filter((s) => s.status === "succeeded" && s.files?.includes("findings.json")).slice(0, FINDINGS_SAMPLE);
  const findings = (await Promise.all(sampled.map((s) => readFindings(auth, s.scanId)))).flat();

  const severity = { critical: 0, high: 0, medium: 0, low: 0, informational: 0 } satisfies Record<Severity, number>;
  let needsValidation = 0;
  for (const f of findings) {
    if (f.state === "needs_validation") needsValidation += 1;
    if (f.state === "confirmed" && f.severity) severity[f.severity] += 1;
  }

  return OverviewSchema.parse({
    total: list.scans.length,
    hasMore: list.nextCursor !== null,
    byState,
    severity,
    needsValidation,
    scannedForFindings: sampled.length,
  });
});
