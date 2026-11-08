import { Suspense, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { ExternalLink, FileText, FolderGit2, LoaderCircle, OctagonX } from "lucide-react";
import { Alert, AlertDescription } from "#/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "#/components/ui/card";
import { Skeleton } from "#/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "#/components/ui/tabs";
import { SCAN_EFFORT_OPTIONS, SCAN_MODEL_OPTIONS, SCAN_PROFILE_OPTIONS, SCAN_SKILL_OPTIONS, SCAN_STEP_COPY } from "../constants";
import { scanFileQuery, scanQuery, useRefreshOnFinish, useScanLinkMode } from "../hooks";
import type { ScanStatus } from "../schemas";
import { scanBytes, scanCost, scanDuration, scanFailure, scanPlural, scanRepoName } from "../utils";
import { ScanDiffCard } from "./scan-diff-card";
import { ScanFindingsTable } from "./scan-findings-table";
import { ScanStatusBadge } from "./scan-status-badge";
import { ScanSummary } from "./scan-summary";
import { ScanVerdictCard } from "./scan-verdict-card";
import { ScanTime } from "./scan-time";

const DEFAULT_FILE = "REPORT.md";

const labelOf = <T extends string>(options: readonly { value: T; label: string }[], value: T) => options.find((o) => o.value === value)?.label ?? value;

function ScanFileViewer({ scanId, file }: { scanId: string; file: string }) {
  const { data, isPending, error } = useQuery(scanFileQuery(scanId, file));

  if (isPending) return <Skeleton className="m-5 h-64" />;
  if (error) {
    return error.message === "File not found" ? (
      <p className="p-5 text-sm leading-relaxed text-muted-foreground">
        {file} is listed for this scan, but its contents could not be read from storage. Refresh to try again. If it keeps failing, run the scan again to regenerate it.
      </p>
    ) : (
      <p className="p-5 text-sm text-destructive">We could not load {file}: {error.message}. Refresh to try again.</p>
    );
  }
  if (data.trim() === "") return <p className="p-5 text-sm text-muted-foreground">{file} is empty.</p>;
  return <pre className="max-h-[70vh] overflow-auto bg-background/50 p-5 font-mono text-[13px] leading-relaxed whitespace-pre-wrap">{data}</pre>;
}

type FactProps = { label: string; children: ReactNode };

function Fact({ label, children }: FactProps) {
  return (
    <div className="grid gap-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium">{children}</dd>
    </div>
  );
}

function ScanFacts({ scan }: { scan: ScanStatus }) {
  const duration = scanDuration(scan.usage?.durationMs);
  const commit = scan.commitSha?.slice(0, 7);

  return (
    <dl className="grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-3 lg:grid-cols-6">
      <Fact label="Kind of review">
        {labelOf(SCAN_SKILL_OPTIONS, scan.skill)}
        {scan.skill === "full" ? `, ${labelOf(SCAN_PROFILE_OPTIONS, scan.profile).toLowerCase()}` : ""}
      </Fact>
      <Fact label="Model">{labelOf(SCAN_MODEL_OPTIONS, scan.model)}</Fact>
      <Fact label="Effort">{labelOf(SCAN_EFFORT_OPTIONS, scan.effort)}</Fact>
      <Fact label="Started">
        <ScanTime value={scan.createdAt} />
      </Fact>
      <Fact label={scan.finishedAt ? "Took" : "Running for"}>{duration ?? (scan.finishedAt ? "Not recorded" : "Just started")}</Fact>
      <Fact label="Code read">
        {commit ? (
          <a href={`${scan.repo.replace(/\.git$/, "").replace(/\/$/, "")}/commit/${scan.commitSha}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-mono text-[13px] underline-offset-4 hover:underline">
            {commit}
            <ExternalLink aria-hidden="true" className="size-3" />
            <span className="sr-only">, opens the commit on GitHub</span>
          </a>
        ) : (
          <span className="text-muted-foreground">{scan.ref ? `Branch ${scan.ref}` : "Default branch"}</span>
        )}
      </Fact>
    </dl>
  );
}

function ScanStatusNotice({ scan }: { scan: ScanStatus }) {
  if (scan.status === "failed") {
    const failure = scanFailure(scan.error);
    return (
      <Alert variant="destructive">
        <OctagonX />
        <div className="grid gap-1">
          <AlertDescription className="font-medium">{failure.title}</AlertDescription>
          <AlertDescription>
            {scan.usage && scan.usage.costUsd > 0 ? `It used ${scanCost(scan.usage.costUsd)} before stopping. ` : ""}
            {failure.advice}
          </AlertDescription>
          {failure.detail && (
            <details className="mt-1 text-xs">
              <summary className="w-fit cursor-pointer rounded-sm font-medium underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Technical detail</summary>
              <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap rounded-md bg-background/60 p-3 font-mono [overflow-wrap:anywhere]">{failure.detail}</pre>
            </details>
          )}
        </div>
      </Alert>
    );
  }
  if (scan.status === "queued" || scan.status === "running") {
    const step = scan.step ? SCAN_STEP_COPY[scan.step] : null;
    return (
      <Alert variant="info">
        <LoaderCircle className="animate-spin" />
        <div className="grid gap-1">
          <AlertDescription className="font-medium">{scan.status === "queued" ? "Waiting for a free slot to start." : (step?.label ?? "Scanning.")}</AlertDescription>
          <AlertDescription>{step?.note ?? "A scan usually takes a few minutes."} This page updates by itself. You can leave and come back.</AlertDescription>
        </div>
      </Alert>
    );
  }
  return null;
}

function findingsDescription(scan: ScanStatus) {
  const { summary } = scan;
  if (!summary) return "What the scan reported. Open a row for the impact, evidence and fix.";
  if (summary.total === 0) return "Nothing was reported.";
  const confirmed = summary.total - summary.needsValidation;
  return `${scanPlural(summary.total, "finding", "findings")}: ${confirmed} confirmed, ${summary.needsValidation} need a person to check. Open a row for the impact, evidence and fix.`;
}

export function ScanDetail({ scanId }: { scanId: string }) {
  const { data: scan } = useSuspenseQuery(scanQuery(scanId));
  useRefreshOnFinish(scan.status);
  const [picked, setPicked] = useState(DEFAULT_FILE);
  const live = useScanLinkMode() === "live";
  const files = scan.files ?? [];
  const file = files.includes(picked) ? picked : (files[0] ?? DEFAULT_FILE);
  const { owner, name } = scanRepoName(scan.repo, scan.scanId);
  const sizes = new Map((scan.artifacts ?? []).map((artifact) => [artifact.name, artifact.sizeBytes]));
  const showFindings = scan.status === "succeeded" && (scan.summary !== null && scan.summary !== undefined ? true : files.includes("findings.json"));

  return (
    <>
      <div className="grid gap-5">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <h1 className="text-[26px] font-semibold leading-none tracking-tight">
            {owner && <span className="text-muted-foreground">{owner}/</span>}
            {name}
          </h1>
          <ScanStatusBadge status={scan.status} />
          {live && (
            <Link
              to="/repos/$repoId"
              params={{ repoId: scan.repoId }}
              className="inline-flex items-center gap-1.5 rounded-sm text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <FolderGit2 aria-hidden="true" className="size-3.5" />
              Repository history
            </Link>
          )}
        </div>
        <ScanFacts scan={scan} />
      </div>

      <ScanStatusNotice scan={scan} />

      {scan.status === "succeeded" && (
        <>
          <ScanSummary scan={scan} />
          {showFindings && (
            <Card>
              <CardHeader className="gap-1.5">
                <CardTitle>Findings</CardTitle>
                <p className="text-xs text-muted-foreground">{findingsDescription(scan)}</p>
              </CardHeader>
              <CardContent className="overflow-hidden p-0">
                <Suspense fallback={<Skeleton className="m-5 h-24" />}>
                  <ScanFindingsTable scanId={scanId} repoId={live ? scan.repoId : undefined} repoLabel={owner ? `${owner}/${name}` : name} commit={scan.commitSha ?? undefined} />
                </Suspense>
              </CardContent>
            </Card>
          )}
          {live && scan.skill === "lite" && scan.commitSha && <ScanVerdictCard repoId={scan.repoId} commit={scan.commitSha} found={scan.summary?.total ?? 0} />}
          {scan.skill === "lite" && (!live || scan.branchId) && (
            <Suspense fallback={<Skeleton className="h-24 w-full" />}>
              <ScanDiffCard scanId={scanId} />
            </Suspense>
          )}
          {scan.skill === "lite" && live && !scan.branchId && (
            <Card>
              <CardHeader className="gap-1.5">
                <CardTitle>No history to compare with</CardTitle>
                <p className="text-xs text-muted-foreground">
                  {scan.untrackedReason ? `This scan has no History: ${scan.untrackedReason}` : scan.ref ? `Elise does not track ${scan.ref}, so this scan has no earlier scans to compare with.` : "This scan has no earlier scans to compare with."}
                </p>
              </CardHeader>
            </Card>
          )}
          <Card>
            <Tabs value={file} onValueChange={(next) => setPicked(files.find((item) => item === next) ?? DEFAULT_FILE)}>
              <CardHeader className="gap-3">
                <div className="grid gap-1.5">
                  <CardTitle>Files</CardTitle>
                  <p className="text-xs text-muted-foreground">What the scan saved. REPORT.md is the written summary; findings.json is the same findings as data.</p>
                </div>
                <TabsList aria-label="Report files">
                  {files.map((item) => (
                    <TabsTrigger key={item} value={item} className="font-mono">
                      <FileText />
                      {item}
                      {sizes.has(item) && <span className="font-sans text-xs text-muted-foreground">{scanBytes(sizes.get(item) ?? 0)}</span>}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </CardHeader>
              <CardContent className="overflow-hidden p-0">
                {files.map((item) => (
                  <TabsContent key={item} value={item}>
                    <ScanFileViewer scanId={scanId} file={item} />
                  </TabsContent>
                ))}
              </CardContent>
            </Tabs>
          </Card>
        </>
      )}
    </>
  );
}
