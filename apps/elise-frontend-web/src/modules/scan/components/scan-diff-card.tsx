import { Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ChevronUp, TriangleAlert } from "lucide-react";
import { Badge } from "#/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "#/components/ui/card";
import { Collapsible, CollapsiblePanel, CollapsibleTrigger } from "#/components/ui/collapsible";
import { cn } from "#/lib/utils";
import { scanDiffQuery } from "../hooks";
import { SEVERITIES, type DiffEntry, type ScanDiff } from "../schemas";
import { scanPlural } from "../utils";
import { ScanSeverityBadge } from "./scan-severity-badge";

type GroupKey = "regressed" | "new" | "notRechecked" | "stillOpen" | "fixed";

type Group = {
  key: GroupKey;
  title: string;
  note: string;
  action: string | null;
  tone: "danger" | "warning" | "neutral" | "success";
  openByDefault: boolean;
};

const GROUPS: readonly Group[] = [
  {
    key: "regressed",
    title: "Came back",
    note: "These were fixed before and appear again.",
    action: "Find what reintroduced them.",
    tone: "danger",
    openByDefault: true,
  },
  {
    key: "new",
    title: "New in this scan",
    note: "Not reported by the previous scan.",
    action: "Review these first: they are the newest risk.",
    tone: "neutral",
    openByDefault: true,
  },
  {
    key: "notRechecked",
    title: "Not re-checked",
    note: "Reported before, but this scan did not mention them or confirm a fix.",
    action: "Treat them as still open until a scan confirms they are gone.",
    tone: "warning",
    openByDefault: true,
  },
  {
    key: "stillOpen",
    title: "Still open",
    note: "Reported before and seen again.",
    action: null,
    tone: "neutral",
    openByDefault: false,
  },
  {
    key: "fixed",
    title: "Fixed",
    note: "The agent checked the code and the problem is gone.",
    action: null,
    tone: "success",
    openByDefault: false,
  },
];

const TONE = {
  danger: "border-status-danger/25 bg-status-danger-soft",
  warning: "border-status-warning/25 bg-status-warning-soft",
  neutral: "border-border bg-muted/40",
  success: "border-status-success/25 bg-status-success-soft",
} as const;

const RANK = new Map<string | null, number>([...SEVERITIES.map((s, i) => [s, i] as const), [null, SEVERITIES.length]]);

const bySeverity = (a: DiffEntry, b: DiffEntry) => (RANK.get(a.severity) ?? 0) - (RANK.get(b.severity) ?? 0);

function DiffRow({ entry }: { entry: DiffEntry }) {
  return (
    <li className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-x-3 gap-y-1 py-2.5 text-sm sm:grid-cols-[auto_minmax(0,1fr)_minmax(0,40%)]">
      <ScanSeverityBadge severity={entry.severity} />
      <span className="font-medium">{entry.title}</span>
      {entry.file && (
        <span className="col-start-2 font-mono text-xs text-muted-foreground [overflow-wrap:anywhere] sm:col-start-3 sm:text-right">
          {entry.file}
          {entry.line ? `:${entry.line}` : ""}
        </span>
      )}
    </li>
  );
}

function summaryLine(diff: ScanDiff) {
  const parts = [
    diff.regressed.length > 0 && `${scanPlural(diff.regressed.length, "problem came", "problems came")} back`,
    diff.new.length > 0 && `${diff.new.length} new`,
    diff.notRechecked.length > 0 && `${diff.notRechecked.length} not re-checked`,
    diff.fixed.length > 0 && `${diff.fixed.length} fixed`,
    diff.stillOpen.length > 0 && `${diff.stillOpen.length} still open`,
  ].filter(Boolean);
  return parts.length === 0 ? "Nothing changed." : `${parts.join(", ")}.`;
}

export function ScanDiffCard({ scanId }: { scanId: string }) {
  const { data } = useSuspenseQuery(scanDiffQuery(scanId));
  const groups = GROUPS.filter((group) => data[group.key].length > 0);

  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-3">
        <div className="grid gap-1.5">
          <CardTitle>What changed since the previous scan</CardTitle>
          <p className="max-w-copy text-sm leading-relaxed text-muted-foreground">{data.previousScanId === null ? "This is the first scan of the repository. Later scans will show what is new, fixed or still open." : summaryLine(data)}</p>
        </div>
        {data.previousScanId !== null && (
          <Link
            to="/scans/$scanId"
            params={{ scanId: data.previousScanId }}
            className="rounded-sm text-sm font-medium underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Open the previous scan
          </Link>
        )}
      </CardHeader>
      {data.previousScanId !== null && (
      <CardContent className="grid grid-cols-[minmax(0,1fr)] gap-4">
        {groups.map((group) => (
            <Collapsible key={group.key} defaultOpen={group.openByDefault} className={cn("rounded-xl border", TONE[group.tone])}>
              <div className="grid gap-1 px-4 pt-3 pb-3">
                <h3 className="text-sm font-semibold">
                  <CollapsibleTrigger className="group flex w-full items-center gap-2 rounded-sm text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    {group.key === "notRechecked" || group.key === "regressed" ? <TriangleAlert aria-hidden="true" className="size-4 shrink-0" /> : null}
                    <span>{group.title}</span>
                    <Badge variant="outline" className="tabular-nums">
                      {data[group.key].length}
                    </Badge>
                    <ChevronUp aria-hidden="true" className="ml-auto size-4 shrink-0 rotate-180 transition-transform group-data-[panel-open]:rotate-0" />
                  </CollapsibleTrigger>
                </h3>
                <p className="text-xs text-muted-foreground">{group.note}</p>
                {group.action && <p className="text-xs font-medium">{group.action}</p>}
              </div>
              <CollapsiblePanel>
                <ul className="divide-y divide-border/70 border-t border-border/70 px-4">
                  {data[group.key].toSorted(bySeverity).map((entry) => (
                    <DiffRow key={entry.fingerprint} entry={entry} />
                  ))}
                </ul>
              </CollapsiblePanel>
            </Collapsible>
        ))}
      </CardContent>
      )}
    </Card>
  );
}
