import { Link } from "@tanstack/react-router";
import { useSuspenseQueries } from "@tanstack/react-query";
import { ArrowUpRight, CheckCircle2, Layers, LoaderCircle, TriangleAlert, XCircle, type LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "#/components/ui/card";
import { Progress } from "#/components/ui/progress";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "#/components/ui/empty";
import { ShellPageHeader } from "#/modules/shell";
import { UsageCard } from "#/modules/usage";
import { Suspense } from "react";
import { Skeleton } from "#/components/ui/skeleton";
import { cn } from "#/lib/utils";
import { overviewQuery, scansQuery } from "../hooks";
import { SEVERITIES, type Severity } from "../schemas";
import { scanActivity, scanPlural, scanSuccessRate } from "../utils";
import { ScanActivityChart } from "./scan-activity-chart";
import { ScanRepoLink } from "./scan-repo-link";
import { ScanStatusBadge } from "./scan-status-badge";
import { ScanSuccessRing } from "./scan-success-ring";
import { ScanTime } from "./scan-time";

const TONE = {
  critical: { bar: "bg-severity-critical/75", dot: "bg-severity-critical" },
  high: { bar: "bg-severity-high/75", dot: "bg-severity-high" },
  medium: { bar: "bg-severity-medium/75", dot: "bg-severity-medium" },
  low: { bar: "bg-severity-low/75", dot: "bg-severity-low" },
  informational: { bar: "bg-severity-informational/75", dot: "bg-severity-informational" },
} satisfies Record<Severity, { bar: string; dot: string }>;

const RECENT = 6;

type StatProps = {
  label: string;
  value: number;
  note: string;
  icon: LucideIcon;
  tone: string;
  pulse?: boolean;
};

function Stat({ label, value, note, icon: Icon, tone, pulse }: StatProps) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
        <span className={cn("grid size-8 place-items-center rounded-lg", tone)}>
          <Icon className={cn("size-4", pulse && "animate-spin")} />
        </span>
      </div>
      <p className="mt-4 text-[34px] font-semibold leading-none tracking-tight tabular-nums">{value}</p>
      <p className="mt-2.5 text-xs text-muted-foreground">{note}</p>
    </Card>
  );
}

export function ScanOverview() {
  const [{ data: overview }, { data: list }] = useSuspenseQueries({ queries: [overviewQuery(), scansQuery()] });
  const peak = Math.max(1, ...SEVERITIES.map((s) => overview.severity[s]));
  const confirmed = SEVERITIES.reduce((sum, s) => sum + overview.severity[s], 0);
  const active = overview.byState.queued + overview.byState.running;
  const rate = scanSuccessRate(overview.byState.succeeded, overview.byState.failed);
  const activity = scanActivity(list.scans, 14, new Date());

  return (
    <>
      <ShellPageHeader title="Overview" description="Security audit activity and confirmed findings across your repositories." />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat
          label={overview.hasMore ? "Latest scans" : "Total scans"}
          value={overview.total}
          note={overview.hasMore ? "Newest page of scans" : "Every scan on this account"}
          icon={Layers}
          tone="bg-secondary text-foreground"
        />
        <Stat
          label="In progress"
          value={active}
          note={active > 0 ? "Updates automatically" : "Nothing running"}
          icon={LoaderCircle}
          tone="bg-status-info-soft text-status-info"
          pulse={active > 0}
        />
        <Stat
          label="Succeeded"
          value={overview.byState.succeeded}
          note={rate === null ? "No finished scans yet" : `${rate}% of finished scans`}
          icon={CheckCircle2}
          tone="bg-status-success-soft text-status-success"
        />
        <Stat
          label="Failed"
          value={overview.byState.failed}
          note={rate === null ? "No finished scans yet" : `${100 - rate}% of finished scans`}
          icon={XCircle}
          tone="bg-status-danger-soft text-status-danger"
        />
      </div>

      <Suspense fallback={<Skeleton className="h-44 w-full" />}>
        <UsageCard />
      </Suspense>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <ScanActivityChart days={activity} />
        <ScanSuccessRing succeeded={overview.byState.succeeded} failed={overview.byState.failed} rate={rate} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Card>
          <CardHeader className="flex-row items-start justify-between">
            <div className="grid gap-1.5">
              <CardTitle>Open confirmed findings</CardTitle>
              <p className="text-xs text-muted-foreground">
                {overview.repos === 0 ? "By severity. Findings appear once a scan finishes" : `Open now, by severity, across ${scanPlural(overview.repos, "repository", "repositories")}`}
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-semibold leading-none tabular-nums">{confirmed}</p>
              <p className="mt-1 text-xs text-muted-foreground">total</p>
            </div>
          </CardHeader>
          <CardContent className="grid gap-5">
            <div aria-hidden="true" className="flex h-2.5 gap-0.5 overflow-hidden rounded-full bg-muted">
              {SEVERITIES.filter((s) => overview.severity[s] > 0).map((s) => (
                <div key={s} className={cn("h-full first:rounded-l-full last:rounded-r-full", TONE[s].bar)} style={{ flexGrow: overview.severity[s] }} />
              ))}
            </div>
            <ul className="grid gap-3.5">
              {SEVERITIES.map((s) => (
                <li key={s} className="grid grid-cols-[7rem_minmax(0,1fr)_2.5rem_3rem] items-center gap-3 text-sm">
                  <span className="flex items-center gap-2.5 capitalize">
                    <span className={cn("size-2 rounded-full", TONE[s].dot)} />
                    {s}
                  </span>
                  <Progress value={(overview.severity[s] / peak) * 100} aria-label={`${s} findings`} indicatorClassName={TONE[s].bar} />
                  <span className="text-right font-medium tabular-nums">{overview.severity[s]}</span>
                  <span className="text-right text-xs tabular-nums text-muted-foreground">{confirmed === 0 ? "0%" : `${Math.round((overview.severity[s] / confirmed) * 100)}%`}</span>
                </li>
              ))}
            </ul>
            {overview.needsValidation > 0 && (
              <div className="flex items-center gap-2.5 rounded-lg border border-status-warning/25 bg-status-warning-soft px-3 py-2.5 text-sm text-status-warning">
                <TriangleAlert className="size-4 shrink-0" />
                {overview.needsValidation} {overview.needsValidation === 1 ? "finding needs" : "findings need"} validation
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="flex flex-col">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Recent scans</CardTitle>
            <Link to="/scans" className="inline-flex items-center gap-1 rounded-sm text-xs font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              View all
              <ArrowUpRight className="size-3.5" />
            </Link>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col">
            {list.scans.length === 0 ? (
              <Empty className="py-8">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <Layers />
                  </EmptyMedia>
                  <EmptyTitle>No scans yet</EmptyTitle>
                  <EmptyDescription>Run your first audit and it will appear here.</EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <ul className="-mx-2 grid">
                {list.scans.slice(0, RECENT).map((scan) => (
                  <li key={scan.scanId} className="flex items-center justify-between gap-3 rounded-lg px-2 py-2.5 text-sm transition-colors hover:bg-accent">
                    <div className="grid min-w-0 gap-0.5">
                      <ScanRepoLink scanId={scan.scanId} repo={scan.repo} />
                      <span className="text-xs">
                        <ScanTime value={scan.createdAt} />
                      </span>
                    </div>
                    <ScanStatusBadge status={scan.status} />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
