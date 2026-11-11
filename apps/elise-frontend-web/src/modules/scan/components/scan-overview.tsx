import { Link } from "@tanstack/react-router";
import { useSuspenseQueries } from "@tanstack/react-query";
import { ArrowUpRight, Layers, LoaderCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "#/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "#/components/ui/empty";
import { ShellPageHeader } from "#/modules/shell";
import { CreditCard } from "#/modules/credit";
import { UsageCard } from "#/modules/usage";
import { Suspense, type ReactNode } from "react";
import { Skeleton } from "#/components/ui/skeleton";
import { isScanActive, overviewQuery, scansQuery } from "../hooks";
import type { ScanStatus } from "../schemas";
import { scanActivity, scanSuccessRate } from "../utils";
import { ScanActivityChart } from "./scan-activity-chart";
import { ScanOrigin } from "./scan-origin";
import { ScanRepoLink } from "./scan-repo-link";
import { ScanStatusBadge } from "./scan-status-badge";
import { ScanSuccessRing } from "./scan-success-ring";
import { ScanTime } from "./scan-time";

const RECENT = 4;

// -----
// Scans take minutes and cost money, so a running scan is shown by name, with a
// way into its live report, and the band is gone when nothing runs. The list
// behind it polls while any scan is active, so it updates by itself.
// -----
function RunningNow({ scans }: { scans: readonly ScanStatus[] }) {
  if (scans.length === 0) return null;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <LoaderCircle aria-hidden="true" className="size-4 animate-spin text-status-info" />
          Running now
        </CardTitle>
        <span className="text-xs text-muted-foreground">Updates automatically</span>
      </CardHeader>
      <CardContent>
        <ul className="-mx-2 grid">
          {scans.map((scan) => (
            <li key={scan.scanId} className="flex items-center justify-between gap-3 rounded-lg px-2 py-2.5 text-sm transition-colors hover:bg-accent">
              <div className="grid min-w-0 gap-0.5">
                <ScanRepoLink scanId={scan.scanId} repo={scan.repo} isPrivate={scan.isPrivate} />
                <ScanOrigin scan={scan} />
              </div>
              <div className="grid justify-items-end gap-1">
                <ScanStatusBadge status={scan.status} />
                <span className="text-xs text-muted-foreground">
                  Started <ScanTime value={scan.createdAt} />
                </span>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

// -----
// The overview leads with what to decide, as the branch page does: the
// repository summary (decide) and the repositories to look at first (attention)
// come in from the screen that owns that data, so this module does not import
// the repository module. The scan history and its health follow.
// -----
type ScanOverviewProps = {
  decide?: ReactNode;
  attention?: ReactNode;
};

export function ScanOverview({ decide, attention }: ScanOverviewProps) {
  const [{ data: overview }, { data: list }] = useSuspenseQueries({ queries: [overviewQuery(), scansQuery()] });
  const rate = scanSuccessRate(overview.byState.succeeded, overview.byState.failed);
  const activity = scanActivity(list.scans, 14, new Date());

  return (
    <>
      <ShellPageHeader title="Overview" description="What needs a decision across your repositories, and how your scans are going." />

      <RunningNow scans={list.scans.filter((scan) => isScanActive(scan.status))} />

      {decide}

      <div className={`grid gap-8 ${attention ? "lg:grid-cols-2" : ""}`}>
        {attention}
        <Card className="flex flex-col">
          <CardHeader className="flex-row items-start justify-between gap-3">
            <div className="grid gap-1.5">
              <CardTitle>Recent scans</CardTitle>
              <p className="text-sm leading-relaxed text-muted-foreground">The latest scans, newest first.</p>
            </div>
            <Link to="/scans" className="inline-flex min-h-6 items-center gap-1 rounded-sm text-xs font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
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
                  <li key={scan.scanId} className="flex min-h-14 items-center justify-between gap-4 rounded-lg px-2 py-2.5 text-sm transition-colors hover:bg-accent">
                    <div className="grid min-w-0 gap-0.5">
                      <ScanRepoLink scanId={scan.scanId} repo={scan.repo} isPrivate={scan.isPrivate} />
                      <ScanOrigin scan={scan} />
                    </div>
                    <div className="grid justify-items-end gap-1">
                      <ScanStatusBadge status={scan.status} />
                      <span className="text-xs">
                        <ScanTime value={scan.createdAt} />
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
        <div className="grid content-start gap-8">
          <Suspense fallback={<Skeleton className="h-72 w-full" />}>
            <UsageCard />
          </Suspense>
          <Suspense fallback={<Skeleton className="h-40 w-full" />}>
            <CreditCard />
          </Suspense>
        </div>
        <ScanSuccessRing succeeded={overview.byState.succeeded} failed={overview.byState.failed} rate={rate} />
        <div className="grid md:col-span-2">
          <ScanActivityChart days={activity} />
        </div>
      </div>
    </>
  );
}
