import { useId, useState, type ComponentType } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTable } from "@tanstack/react-table";
import { ChevronRight, ChevronUp, CircleCheck, CircleDashed, CircleHelp, CircleX, ExternalLink, OctagonX } from "lucide-react";
import { cn } from "#/lib/utils";
import { dataTableColumns, dataTableFeatures } from "#/lib/data-table";
import { Alert, AlertDescription } from "#/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "#/components/ui/card";
import { DataTable } from "#/components/ui/data-table";
import { Skeleton } from "#/components/ui/skeleton";
import { scansQuery, verdictQuery } from "../hooks";
import type { Finding, Verdict, VerdictFinding } from "../schemas";
import { ScanFindingSheet } from "./scan-finding-sheet";
import { ScanNewDialog } from "./scan-new-dialog";
import { ScanVerdictRun } from "./scan-verdict-run";
import { scanPlural } from "../utils";
import { ScanSeverityBadge } from "./scan-severity-badge";

export const VERDICT_COPY = {
  pass: { title: "Passed the scan policy", note: "Scanned enough times and nothing open is over the limits. An AI audit can miss problems, so this is advice and not proof that the commit is safe.", variant: "success", Icon: CircleCheck },
  fail: { title: "Do not ship yet", note: "Trusted scans left problems that block this commit. You can fix them, or an account admin can accept the risk with a note.", variant: "destructive", Icon: OctagonX },
  cannot_tell: { title: "Cannot tell yet", note: "This is not a failure. This commit needs more scans before the answer can be yes or no.", variant: "warning", Icon: CircleHelp },
} as const;

// -----
// A screen that can record decisions passes this component in.
// The scan module does not import the finding module (it imports
// this one), so the control comes from outside.
// -----
export type DecideFindingProps = { repoId: string; repoUrl: string; finding: VerdictFinding };
export type DecideFinding = ComponentType<DecideFindingProps>;

type FindingRowsProps = {
  title: string;
  hint: string;
  findings: readonly (VerdictFinding & { note?: string; acceptedUntil?: string })[];
  decide?: { Control: DecideFinding; repoId: string; repoUrl: string };
  collapsed?: boolean;
};

const sheetFinding = (finding: VerdictFinding): Finding => ({
  title: finding.title,
  state: finding.severity === null ? "needs_validation" : "confirmed",
  severity: finding.severity,
  place: finding.file && finding.line !== null ? { file: finding.file, line: finding.line } : null,
  detail: { class: finding.class, actor: null, impact: finding.impact ?? null, evidence: finding.evidence ?? null, fix: finding.fix ?? null, needs: finding.needs ?? null, triage: null },
});

type VerdictFindingRow = {
  finding: FindingRowsProps["findings"][number];
  decide: FindingRowsProps["decide"];
  open: () => void;
};

const column = dataTableColumns<VerdictFindingRow>();

const baseColumns = [
  column.display({
    id: "severity",
    header: "Severity",
    meta: { head: "w-32 whitespace-nowrap", cell: "align-top" },
    cell: ({ row }) => <ScanSeverityBadge severity={row.original.finding.severity} />,
  }),
  column.display({
    id: "finding",
    header: "Finding",
    meta: { cell: "whitespace-normal align-top font-medium" },
    cell: ({ row }) => {
      const { finding, decide, open } = row.original;
      return (
        <>
          {decide ? (
            <button type="button" aria-haspopup="dialog" onClick={open} className="min-h-6 rounded-sm text-left hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              {finding.title}
            </button>
          ) : (
            finding.title
          )}
          {finding.impact && <span className="mt-1 line-clamp-2 text-sm font-normal leading-relaxed text-muted-foreground" title={finding.impact}>{finding.impact}</span>}
          {finding.note && <span className="mt-1 block text-sm font-normal leading-relaxed text-muted-foreground">Accepted until {finding.acceptedUntil?.slice(0, 10)}: {finding.note}</span>}
        </>
      );
    },
  }),
  column.display({
    id: "where",
    header: "Where",
    meta: { head: "w-[36%]", cell: "whitespace-normal align-top font-mono text-xs text-muted-foreground [overflow-wrap:anywhere]" },
    cell: ({ row }) => {
      const { file, line } = row.original.finding;
      return file ? `${file}${line ? `:${line}` : ""}` : "-";
    },
  }),
];

const decidingColumns = column.columns([
  ...baseColumns,
  column.display({
    id: "decision",
    header: "Your decision",
    meta: { head: "w-56", cell: "align-top" },
    cell: ({ row }) => {
      const { finding, decide } = row.original;
      return decide ? <decide.Control repoId={decide.repoId} repoUrl={decide.repoUrl} finding={finding} /> : null;
    },
  }),
]);

const readOnlyColumns = column.columns([
  ...baseColumns,
  column.display({ id: "decision", header: () => null, meta: { head: "w-56", decorative: true }, cell: () => null }),
]);

// -----
// A collapsed list is for a screen that already lists the same problems itself (the
// scan report has its own findings table): the list starts closed, with the
// count in the heading, and one click opens it to decide.
// -----
function FindingRows({ title, hint, findings, decide, collapsed = false }: FindingRowsProps) {
  const [selected, setSelected] = useState<number | undefined>();
  const [open, setOpen] = useState(!collapsed);
  const headingId = useId();
  const rows = findings.map((finding, index) => ({ finding, decide, open: () => setSelected(index) }));
  const table = useTable({ features: dataTableFeatures, columns: decide ? decidingColumns : readOnlyColumns, data: rows, getRowId: (row) => row.finding.fingerprint });
  if (findings.length === 0) return null;
  const selectedFinding = selected === undefined ? undefined : findings[selected];
  return (
    <section aria-labelledby={headingId} className="grid gap-3">
      <div className="grid gap-1.5">
        <h3 id={headingId} className="text-[15px] font-semibold">
          {collapsed ? (
            <button
              type="button"
              aria-expanded={open}
              onClick={() => setOpen(!open)}
              className="group flex min-h-8 w-full items-center gap-2 rounded-sm text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {title}
              <ChevronUp aria-hidden="true" className={cn("ml-auto size-4 shrink-0 text-muted-foreground transition-transform", !open && "rotate-180")} />
            </button>
          ) : (
            title
          )}
        </h3>
        <p className="max-w-copy text-sm leading-relaxed text-muted-foreground">{collapsed && !open ? "These count against the commit. Open the list to read each problem and record your decision." : hint}</p>
      </div>
      {open && (
      <div className="overflow-hidden rounded-lg border">
        <DataTable table={table} tableProps={{ className: "table-fixed", "aria-labelledby": headingId }} rowProps={() => ({ className: decide ? undefined : "hover:bg-transparent" })} />
      </div>
      )}
      {decide && (
        <ScanFindingSheet
          findings={findings.map(sheetFinding)}
          selected={selectedFinding ? selected : undefined}
          onSelect={setSelected}
          decision={
            selectedFinding && (
              <>
                <span className="text-sm font-medium">Your decision</span>
                <decide.Control repoId={decide.repoId} repoUrl={decide.repoUrl} finding={selectedFinding} />
              </>
            )
          }
        />
      )}
    </section>
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
      label: `At least ${scans.required} scans of this commit`,
      detail: missing === 0 ? `This commit has ${scans.counted} scans.` : `${scans.counted} of ${scans.required} so far. Run ${missing} more scan${missing === 1 ? "" : "s"} of this exact commit. Only finished lite scans count.`,
      state: missing === 0 ? "ok" : "wait",
    },
    {
      label: "Earlier problems re-checked",
      detail: historyReason ? historyReason.message : "The scans checked every problem that was already open.",
      state: historyReason ? "fail" : scans.counted === 0 ? "wait" : "ok",
    },
    {
      label: "Nothing open over the limits",
      detail: `${over.length > 0 ? `${over.join(", ")}.` : openTotal === 0 ? "Nothing is open." : `${openTotal} open, all within the limits.`} Allowed: ${limits.critical} critical, ${limits.high} high, up to ${limits.medium} medium.`,
      state: over.length > 0 ? "fail" : "ok",
    },
  ];
}

// -----
// What stands between this commit and a pass, as one sentence the reader can act
// on. It follows the same three conditions as the checklist, so the two never
// disagree.
// -----
export function verdictNextSteps(verdict: Verdict): string {
  const { scans, limits, counts, reasons } = verdict;
  const missing = Math.max(0, scans.required - scans.counted);
  const steps: string[] = [];
  if (missing > 0) steps.push(`run ${scanPlural(missing, "more scan", "more scans")} of this commit`);
  if (reasons.some((reason) => HISTORY_CODES.has(reason.code))) steps.push("scan again so earlier problems get re-checked");
  const overLimit = (counts.critical > limits.critical ? counts.critical : 0) + (counts.high > limits.high ? counts.high : 0) + (counts.medium > limits.medium ? counts.medium : 0);
  if (overLimit > 0) steps.push(`fix or accept ${scanPlural(overLimit, "problem", "problems")} over the limits`);
  if (counts.needsValidation > 0) steps.push(`have a person check ${scanPlural(counts.needsValidation, "problem", "problems")} by hand`);
  if (steps.length === 0) return "Nothing blocks this commit.";
  return `To pass: ${steps.join(", ")}.`;
}

const CHECK_ICON = {
  ok: { Icon: CircleCheck, className: "text-status-success", label: "Met" },
  fail: { Icon: CircleX, className: "text-status-danger", label: "Not met" },
  wait: { Icon: CircleDashed, className: "text-status-warning", label: "Waiting" },
} as const;

function VerdictChecklist({ verdict }: { verdict: Verdict }) {
  const checks = verdictChecks(verdict);
  const unmet = checks.filter((check) => check.state !== "ok");
  return (
    <details className="group rounded-lg border">
      <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-2 gap-y-0.5 rounded-lg px-4 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
        <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-90" />
        <span className="text-[15px] font-semibold">How this is decided</span>
        <span className="max-w-copy text-sm leading-relaxed text-muted-foreground">
          {checks.length - unmet.length} of {checks.length} checks met{unmet.length > 0 ? `. Not met: ${unmet.map((check) => check.label.toLowerCase()).join(", ")}.` : "."}
        </span>
      </summary>
      <div className="grid gap-3 border-t px-4 py-3">
        <p className="max-w-copy text-sm leading-relaxed text-muted-foreground">A commit passes when all three are met. The answer uses every scan of this commit and the decisions your team recorded. A new push starts again at zero.</p>
        <ul className="grid gap-2.5">
          {checks.map((check) => {
            const { Icon, className, label } = CHECK_ICON[check.state];
            return (
              <li key={check.label} className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-x-2.5 text-sm">
                <Icon aria-hidden="true" className={`mt-0.5 size-4 ${className}`} />
                <span>
                  <span className="font-medium">{check.label}</span>
                  <span className="sr-only"> ({label})</span>
                  <span className="block max-w-copy text-sm leading-relaxed text-muted-foreground">{check.detail}</span>
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </details>
  );
}

type VerdictBodyProps = { verdict: Verdict; repoId: string; repoUrl?: string; branchOpen?: number; Decision?: DecideFinding; compactFindings?: boolean };

function VerdictBody({ verdict, repoId, repoUrl, branchOpen, Decision, compactFindings = false }: VerdictBodyProps) {
  const copy = VERDICT_COPY[verdict.verdict];
  const { scans } = verdict;
  const missing = Math.max(0, scans.required - scans.counted);
  const needsScan = missing > 0;
  const { data: list } = useQuery(scansQuery());
  const last = list?.scans.find((scan) => scan.scanId === scans.ids[0]);
  const oneOff = branchOpen === undefined ? 0 : Math.max(0, verdict.open.length - branchOpen);
  const oneOffHint = oneOff === 0 ? "" : ` ${oneOff === 1 ? "1 came from a one-off scan of this commit and is" : `${oneOff} came from a one-off scan of this commit and are`} not in the branch's findings below.`;
  return (
    <>
      <Alert variant={copy.variant} className="[&>svg]:mt-1 [&>svg]:size-5">
        <copy.Icon />
        <div className="grid gap-1.5">
          <AlertDescription className="text-xl font-semibold leading-tight">{copy.title}</AlertDescription>
          <AlertDescription className="max-w-copy text-foreground">{copy.note}</AlertDescription>
        </div>
      </Alert>
      {repoUrl && (
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 rounded-lg border bg-muted/50 p-4">
          <div className="grid min-w-0 flex-1 basis-64 gap-1">
            <p className="text-sm font-medium">{needsScan ? `Next step: scan this commit ${missing === 1 ? "once more" : `${missing} more times`}` : "Want another look at this exact commit?"}</p>
            <p className="max-w-copy text-sm leading-relaxed text-muted-foreground">Scans exactly {verdict.commit.slice(0, 7)}, even if the branch has moved on. The worst result counts.</p>
          </div>
          <div className="flex flex-wrap items-start gap-3">
            {needsScan && last && <ScanVerdictRun repoId={repoId} repoUrl={repoUrl} commit={verdict.commit} last={last} />}
            <ScanNewDialog
              label={needsScan && last ? "Choose options" : "Run another scan of this commit"}
              size="default"
              variant={needsScan && !last ? "default" : "outline"}
              repo={repoUrl}
              startRef={verdict.commit}
              startOptions={last && { model: last.model === "claude-opus-5-5" ? undefined : last.model, effort: last.effort, skill: last.skill, profile: last.profile }}
            />
          </div>
        </div>
      )}
      <VerdictChecklist verdict={verdict} />
      <div className="grid gap-6">
        <FindingRows
          title={`${scanPlural(verdict.open.length, "problem", "problems")} still open on this commit`}
          hint={`These count against the commit. Select one to read the impact and the fix, then record your decision.${oneOffHint}`}
          findings={verdict.open}
          decide={Decision && repoUrl ? { Control: Decision, repoId, repoUrl } : undefined}
          collapsed={compactFindings}
        />
        <FindingRows title={scanPlural(verdict.accepted.length, "accepted risk", "accepted risks")} hint="An account admin chose to ship with these until the date shown. After that they block again." findings={verdict.accepted} />
        <FindingRows
          title={`${scanPlural(verdict.dismissed.length, "finding", "findings")} dismissed as ${verdict.dismissed.length === 1 ? "a false positive" : "false positives"}`}
          hint="A person checked these and decided they are not real problems."
          findings={verdict.dismissed}
        />
      </div>
      <div className="border-t pt-3">
        <p className="max-w-copy text-sm leading-relaxed text-muted-foreground">
          <span className="font-medium text-foreground">Advice, not a guarantee.</span> This answer comes from an AI review of the code. It can miss a problem, and a scanned repository can try to steer it. Do not use it as your only release check.
        </p>
      </div>
    </>
  );
}

type ScanVerdictCardProps = { repoId: string; commit: string; repoUrl?: string; found?: number; scope?: "scan" | "branch"; branchOpen?: number; Decision?: DecideFinding; compactFindings?: boolean };

const CHIP_CLASS = "inline-flex min-h-6 items-center gap-1.5 rounded-md border bg-background px-2 py-0.5 text-sm";

function CommitChip({ commit, repoUrl }: { commit: string; repoUrl?: string }) {
  const short = commit.slice(0, 7);
  const label = (
    <>
      <span className="text-muted-foreground">Commit</span>
      <span className="font-mono">{short}</span>
    </>
  );
  if (!repoUrl) return <span className={CHIP_CLASS} title="The exact commit this answer is for">{label}</span>;
  return (
    <a
      href={`${repoUrl.replace(/\.git$/, "").replace(/\/$/, "")}/commit/${commit}`}
      target="_blank"
      rel="noreferrer"
      title="The exact commit this answer is for. Open it on GitHub."
      aria-label={`Open commit ${short} on GitHub`}
      className={`${CHIP_CLASS} transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
    >
      {label}
      <ExternalLink aria-hidden="true" className="size-3 text-muted-foreground" />
    </a>
  );
}

export function ScanVerdictCard({ repoId, commit, repoUrl, found, scope = "scan", branchOpen, Decision, compactFindings = false }: ScanVerdictCardProps) {
  const { data, isPending, error } = useQuery(verdictQuery(repoId, commit));
  const nextSteps = data && verdictNextSteps(data);

  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-3 pb-6">
        <div className="grid gap-1.5">
          <CardTitle>Ready to ship?</CardTitle>
          {nextSteps && <p className="max-w-copy text-sm leading-relaxed text-muted-foreground">{nextSteps}</p>}
          {scope === "scan" && <p className="max-w-copy text-sm leading-relaxed text-muted-foreground">The answer belongs to the commit, not to this scan.</p>}
          {found === 0 && data && data.open.length > 0 && <p className="max-w-copy text-sm leading-relaxed text-muted-foreground">This scan found nothing. The open problems below come from other scans of the same commit.</p>}
        </div>
        <CommitChip commit={commit} repoUrl={repoUrl} />
      </CardHeader>
      <CardContent className="grid gap-4">
        {isPending ? <Skeleton className="h-16" /> : error ? <p className="text-sm text-destructive">We could not load the verdict: {error.message}. Refresh to try again.</p> : <VerdictBody verdict={data} repoId={repoId} repoUrl={repoUrl} branchOpen={branchOpen} Decision={Decision} compactFindings={compactFindings} />}
      </CardContent>
    </Card>
  );
}
