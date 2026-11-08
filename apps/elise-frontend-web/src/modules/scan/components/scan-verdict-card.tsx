import { useQuery } from "@tanstack/react-query";
import { CircleCheck, CircleDashed, CircleHelp, CircleX, OctagonX } from "lucide-react";
import { Alert, AlertDescription } from "#/components/ui/alert";
import { Badge } from "#/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "#/components/ui/card";
import { Skeleton } from "#/components/ui/skeleton";
import { verdictQuery } from "../hooks";
import type { Verdict, VerdictFinding } from "../schemas";
import { ScanSeverityBadge } from "./scan-severity-badge";

const VERDICT_COPY = {
  pass: { title: "Passed the scan policy", note: "Scanned enough times and nothing open is over the limits. An AI audit can miss problems, so this is advice and not proof that the commit is safe.", variant: "success", Icon: CircleCheck },
  fail: { title: "Do not ship yet", note: "Trusted scans left problems that block this commit. Fix them, have a person check the unrated ones, or accept the risk with a note.", variant: "destructive", Icon: OctagonX },
  cannot_tell: { title: "Cannot tell yet", note: "This is not a failure. Elise needs more scans of this exact commit before it will say yes or no.", variant: "warning", Icon: CircleHelp },
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

type Check = { label: string; detail: string; state: "ok" | "fail" | "wait" };

const HISTORY_CODES = new Set(["unchecked_priors", "too_many_priors"]);

// -----
// The rule, one line per condition, each marked met or not. A commit ships
// only when all three are met; the first one not met is what to do next.
// -----
function verdictChecks(verdict: Verdict): Check[] {
  const { scans, limits, counts, reasons } = verdict;
  const missing = Math.max(0, scans.required - scans.counted);
  const historyReason = reasons.find((reason) => HISTORY_CODES.has(reason.code));
  const over: string[] = [];
  if (counts.critical > limits.critical) over.push(`${counts.critical} critical (allowed ${limits.critical})`);
  if (counts.high > limits.high) over.push(`${counts.high} high (allowed ${limits.high})`);
  if (counts.medium > limits.medium) over.push(`${counts.medium} medium (allowed ${limits.medium})`);
  if (counts.needsValidation > 0) over.push(`${counts.needsValidation} not checked by a person yet`);
  const openTotal = counts.critical + counts.high + counts.medium + counts.low + counts.informational + counts.needsValidation;

  return [
    {
      label: `Scanned ${scans.required} times`,
      detail: missing === 0 ? `${scans.counted} scans of this commit.` : `${scans.counted} of ${scans.required} so far. Run ${missing} more scan${missing === 1 ? "" : "s"} of this exact commit. Only finished lite scans count.`,
      state: missing === 0 ? "ok" : "wait",
    },
    {
      label: "Earlier problems re-checked",
      detail: historyReason ? historyReason.message : "The scans checked every problem already open in the History.",
      state: historyReason ? "fail" : scans.counted === 0 ? "wait" : "ok",
    },
    {
      label: "Nothing open over the limits",
      detail: over.length > 0 ? `${over.join(", ")}.` : openTotal === 0 ? "Nothing is open." : `${openTotal} open, all within the limits of ${limits.critical} critical, ${limits.high} high and ${limits.medium} medium.`,
      state: over.length > 0 ? "fail" : "ok",
    },
  ];
}

const CHECK_ICON = {
  ok: { Icon: CircleCheck, className: "text-status-success", label: "Met" },
  fail: { Icon: CircleX, className: "text-status-danger", label: "Not met" },
  wait: { Icon: CircleDashed, className: "text-status-warning", label: "Waiting" },
} as const;

function VerdictChecklist({ verdict }: { verdict: Verdict }) {
  return (
    <div className="grid gap-2">
      <h3 className="text-sm font-semibold">How this is decided</h3>
      <p className="text-xs text-muted-foreground">A commit passes when all three are met. Scans are counted per commit, so a new push starts again at zero.</p>
      <ul className="grid gap-2">
        {verdictChecks(verdict).map((check) => {
          const { Icon, className, label } = CHECK_ICON[check.state];
          return (
            <li key={check.label} className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-x-2.5 text-sm">
              <Icon aria-hidden="true" className={`mt-0.5 size-4 ${className}`} />
              <span>
                <span className="font-medium">{check.label}</span>
                <span className="sr-only"> ({label})</span>
                <span className="block text-xs text-muted-foreground">{check.detail}</span>
              </span>
            </li>
          );
        })}
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
      <VerdictChecklist verdict={verdict} />
      <p className="sr-only">
        {scans.counted} of {scans.required} required scans counted. Limits: {limits.critical} critical, {limits.high} high, {limits.medium} medium.
      </p>
      <FindingRows title="Open" findings={verdict.open} />
      <FindingRows title="Accepted risk" findings={verdict.accepted} />
      <FindingRows title="Dismissed" findings={verdict.dismissed} />
      <p className="border-t pt-3 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">Advice, not a guarantee.</span> This answer comes from an AI review of the code. It can miss a problem, and a scanned repository can try to steer it. Do not use it as your only release check.
      </p>
    </>
  );
}

type ScanVerdictCardProps = { repoId: string; commit: string; found?: number; scope?: "scan" | "branch" };

export function ScanVerdictCard({ repoId, commit, found, scope = "scan" }: ScanVerdictCardProps) {
  const { data, isPending, error } = useQuery(verdictQuery(repoId, commit));
  const short = commit.slice(0, 7);

  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-3">
        <div className="grid gap-1.5">
          <CardTitle>
            Can commit <span className="font-mono">{short}</span> ship?
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            {scope === "branch" ? `The newest commit Elise read on this branch.` : `The answer belongs to the commit, not to this scan.`} It is decided from every scan of {short} and the decisions people recorded, and a different commit has its own answer.
          </p>
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
