import { useQuery } from "@tanstack/react-query";
import { CircleCheck, CircleHelp, OctagonX } from "lucide-react";
import { Alert, AlertDescription } from "#/components/ui/alert";
import { Badge } from "#/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "#/components/ui/card";
import { Skeleton } from "#/components/ui/skeleton";
import { verdictQuery } from "../hooks";
import type { Verdict, VerdictFinding } from "../schemas";
import { ScanSeverityBadge } from "./scan-severity-badge";

const VERDICT_COPY = {
  pass: { title: "Safe to ship", note: "Enough scans of this commit agree and nothing is over the limits.", variant: "success", Icon: CircleCheck },
  fail: { title: "Do not ship yet", note: "Trusted scans left problems that block this commit. Fix them, have a person check the unrated ones, or accept the risk with a note.", variant: "destructive", Icon: OctagonX },
  cannot_tell: { title: "Cannot tell yet", note: "The scans of this commit are not enough to decide. See why below.", variant: "warning", Icon: CircleHelp },
} as const;

function FindingRows({ title, findings }: { title: string; findings: readonly (VerdictFinding & { note?: string; acceptedUntil?: string })[] }) {
  if (findings.length === 0) return null;
  return (
    <div className="grid gap-1">
      <h3 className="text-sm font-semibold">
        {title} <span className="tabular-nums text-muted-foreground">{findings.length}</span>
      </h3>
      <ul className="divide-y divide-border/70">
        {findings.map((finding) => (
          <li key={finding.fingerprint} className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-x-3 gap-y-0.5 py-2 text-sm">
            <ScanSeverityBadge severity={finding.severity} />
            <span className="font-medium">{finding.title}</span>
            {finding.file && (
              <span className="col-start-2 font-mono text-xs text-muted-foreground [overflow-wrap:anywhere]">
                {finding.file}
                {finding.line ? `:${finding.line}` : ""}
              </span>
            )}
            {finding.note && <span className="col-start-2 text-xs text-muted-foreground">Accepted until {finding.acceptedUntil?.slice(0, 10)}: {finding.note}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}

function VerdictBody({ verdict }: { verdict: Verdict }) {
  const copy = VERDICT_COPY[verdict.verdict];
  const { limits, scans } = verdict;
  return (
    <>
      <Alert variant={copy.variant}>
        <copy.Icon />
        <div className="grid gap-1">
          <AlertDescription className="font-medium">{copy.title}</AlertDescription>
          <AlertDescription>{copy.note}</AlertDescription>
        </div>
      </Alert>
      {verdict.reasons.length > 0 && (
        <ul className="grid gap-1 text-sm">
          {verdict.reasons.map((reason) => (
            <li key={reason.code}>{reason.message}</li>
          ))}
        </ul>
      )}
      <p className="text-xs text-muted-foreground">
        {scans.counted} of {scans.required} required scans counted. Limits: {limits.critical} critical, {limits.high} high, {limits.medium} medium.
        {verdict.counts.needsValidation > 0 ? ` ${verdict.counts.needsValidation} still need a person to check.` : ""}
      </p>
      <FindingRows title="Open" findings={verdict.open} />
      <FindingRows title="Accepted risk" findings={verdict.accepted} />
      <FindingRows title="Dismissed" findings={verdict.dismissed} />
    </>
  );
}

export function ScanVerdictCard({ repoId, commit, found }: { repoId: string; commit: string; found: number }) {
  const { data, isPending, error } = useQuery(verdictQuery(repoId, commit));

  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-3">
        <div className="grid gap-1.5">
          <CardTitle>Can this commit ship?</CardTitle>
          <p className="text-xs text-muted-foreground">Decided from every scan of commit {commit.slice(0, 7)}, not only this one, and the decisions people recorded. It is recomputed each time.</p>
          {found === 0 && data && data.open.length > 0 && <p className="text-xs text-muted-foreground">This scan found nothing. The open problems below come from other scans of the same commit.</p>}
        </div>
        {data && <Badge variant="outline">{VERDICT_COPY[data.verdict].title}</Badge>}
      </CardHeader>
      <CardContent className="grid gap-4">
        {isPending ? <Skeleton className="h-16" /> : error ? <p className="text-sm text-destructive">We could not load the verdict: {error.message}. Refresh to try again.</p> : <VerdictBody verdict={data} />}
      </CardContent>
    </Card>
  );
}
