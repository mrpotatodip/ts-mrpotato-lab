import { Suspense, useState } from "react";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { FileText, LoaderCircle, OctagonX } from "lucide-react";
import { Alert, AlertDescription } from "#/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "#/components/ui/card";
import { SkeletonBar } from "#/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "#/components/ui/tabs";
import { GithubPrivateBadge } from "#/modules/github";
import { ShellPageHeader } from "#/modules/shell";
import { SCAN_STEP_COPY } from "../constants";
import { scanFileQuery, scanQuery, useRefreshOnFinish } from "../hooks";
import type { ScanStatus } from "../schemas";
import { scanBytes, scanCost, scanFailure, scanPlural, scanRepoName } from "../utils";
import { ScanBranchScans } from "./scan-branch-scans";
import { ScanChangeAlerts } from "./scan-change-alerts";
import { ScanDiffSkeleton, ScanFindingsTableSkeleton } from "./scan-detail-skeleton";
import { ScanDiffCard } from "./scan-diff-card";
import { ScanFindingsTable } from "./scan-findings-table";
import { ScanHeaderMeta } from "./scan-header-meta";
import { ScanNewDialog } from "./scan-new-dialog";
import { ScanRunDetails } from "./scan-run-details";
import { ScanSummary } from "./scan-summary";
import { ScanVerdictCard, type DecideFinding } from "./scan-verdict-card";

const DEFAULT_FILE = "REPORT.md";

function ScanFileViewer({ scanId, file }: { scanId: string; file: string }) {
  const { data, isPending, error } = useQuery(scanFileQuery(scanId, file));

  if (isPending) return <SkeletonBar className="m-5 h-64" />;
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

type ScanDetailProps = {
  scanId: string;
  Decision?: DecideFinding;
};

// -----
// A scan report, laid out like the branch page it belongs to: a header with
// the branch and one line about the run, then the answer, what changed, and
// the findings, and last the things that matter less (the scans around it,
// how it was set up, the files). `Decision` is the control that records a
// decision on a verdict row, passed in because this module cannot import the
// finding module; without it the answer is read-only.
// -----
export function ScanDetail({ scanId, Decision }: ScanDetailProps) {
  const { data: scan } = useSuspenseQuery(scanQuery(scanId));
  useRefreshOnFinish(scan.status);
  const [picked, setPicked] = useState(DEFAULT_FILE);
  const files = scan.files ?? [];
  const file = files.includes(picked) ? picked : (files[0] ?? DEFAULT_FILE);
  const { owner, name } = scanRepoName(scan.repo, scan.scanId);
  const sizes = new Map((scan.artifacts ?? []).map((artifact) => [artifact.name, artifact.sizeBytes]));
  const showFindings = scan.status === "succeeded" && (scan.summary !== null && scan.summary !== undefined ? true : files.includes("findings.json"));
  const succeeded = scan.status === "succeeded";

  return (
    <>
      <ShellPageHeader
        title={
          <>
            {owner && <span className="text-muted-foreground">{owner}/</span>}
            {name}
          </>
        }
        badges={<GithubPrivateBadge isPrivate={scan.isPrivate} />}
        below={<ScanHeaderMeta scan={scan} />}
      >
        <ScanNewDialog
          label={scan.branch ? "Scan this branch again" : "Scan again"}
          size="default"
          variant="outline"
          repo={scan.repo}
          startBranch={scan.branch ?? undefined}
          startRef={scan.branch ? undefined : (scan.ref ?? undefined)}
        />
      </ShellPageHeader>

      <ScanStatusNotice scan={scan} />

      {succeeded && (
        <>
          <ScanSummary scan={scan} />
          {scan.skill === "lite" && scan.commitSha && <ScanVerdictCard repoId={scan.repoId} commit={scan.commitSha} repoUrl={scan.repo} found={scan.summary?.total ?? 0} Decision={Decision} compactFindings={showFindings} />}
          {scan.skill === "lite" && scan.branchId && <ScanChangeAlerts scanId={scanId} />}
          {scan.skill === "lite" && scan.branchId && (
            <Suspense fallback={<ScanDiffSkeleton />}>
              <ScanDiffCard scanId={scanId} />
            </Suspense>
          )}
          {scan.skill === "lite" && !scan.branchId && (
            <Card>
              <CardHeader className="gap-1.5">
                <CardTitle>No history to compare with</CardTitle>
                <p className="max-w-copy text-sm leading-relaxed text-muted-foreground">
                  {scan.untrackedReason ? `This scan has no History: ${scan.untrackedReason}` : scan.ref ? `EliseLAB does not track ${scan.ref}, so this scan has no earlier scans to compare with.` : "This scan has no earlier scans to compare with."}
                </p>
              </CardHeader>
            </Card>
          )}
          {showFindings && (
            <Card>
              <CardHeader className="gap-1.5">
                <CardTitle>Findings</CardTitle>
                <p className="max-w-copy text-sm leading-relaxed text-muted-foreground">{findingsDescription(scan)}</p>
              </CardHeader>
              <CardContent className="overflow-hidden p-0">
                <Suspense fallback={<ScanFindingsTableSkeleton />}>
                  <ScanFindingsTable scanId={scanId} repoId={scan.repoId} repoLabel={owner ? `${owner}/${name}` : name} commit={scan.commitSha ?? undefined} />
                </Suspense>
              </CardContent>
            </Card>
          )}
          <ScanBranchScans scan={scan} />
        </>
      )}

      <ScanRunDetails scan={scan} />

      {succeeded && (
        <Card>
          <Tabs value={file} onValueChange={(next) => setPicked(files.find((item) => item === next) ?? DEFAULT_FILE)}>
            <CardHeader className="gap-3">
              <div className="grid gap-1.5">
                <CardTitle>Files</CardTitle>
                <p className="max-w-copy text-sm leading-relaxed text-muted-foreground">What the scan saved. REPORT.md is the written summary; findings.json is the same findings as data.</p>
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
      )}
    </>
  );
}
