import { Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Button } from "#/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "#/components/ui/card";
import { overviewQuery, scansQuery } from "../hooks";
import { SEVERITIES } from "../schemas";
import { ScanStatusBadge } from "./scan-status-badge";

const BAR = {
  critical: "bg-destructive",
  high: "bg-[var(--status-danger)]",
  medium: "bg-[var(--status-warning)]",
  low: "bg-[var(--status-info)]",
  informational: "bg-[var(--status-neutral)]",
} as const;

const RECENT = 5;

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-semibold tabular-nums">{value}</p>
      </CardContent>
    </Card>
  );
}

export function ScanOverview() {
  const { data: overview } = useSuspenseQuery(overviewQuery());
  const { data: list } = useSuspenseQuery(scansQuery());
  const peak = Math.max(1, ...SEVERITIES.map((s) => overview.severity[s]));

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Overview</h1>
        <Button render={<Link to="/scans" />}>New scan</Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label={overview.hasMore ? "Latest scans" : "Scans"} value={overview.total} />
        <Stat label="Running" value={overview.byState.queued + overview.byState.running} />
        <Stat label="Succeeded" value={overview.byState.succeeded} />
        <Stat label="Failed" value={overview.byState.failed} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Confirmed findings by severity</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            {SEVERITIES.map((s) => (
              <div key={s} className="grid grid-cols-[6rem_1fr_2rem] items-center gap-3 text-sm">
                <span className="capitalize">{s}</span>
                <div className="h-2 rounded-full bg-muted">
                  <div className={`h-2 rounded-full ${BAR[s]}`} style={{ width: `${(overview.severity[s] / peak) * 100}%` }} />
                </div>
                <span className="text-right tabular-nums">{overview.severity[s]}</span>
              </div>
            ))}
            <p className="text-xs text-muted-foreground">
              {overview.needsValidation} need validation. Counted from the {overview.scannedForFindings} newest finished scans.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent scans</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            {list.scans.length === 0 && <p className="text-sm text-muted-foreground">No scans yet.</p>}
            {list.scans.slice(0, RECENT).map((scan) => (
              <div key={scan.scanId} className="flex items-center justify-between gap-3 text-sm">
                <Link to="/scans/$scanId" params={{ scanId: scan.scanId }} className="truncate font-medium underline-offset-4 hover:underline">
                  {scan.repo?.replace("https://github.com/", "") ?? scan.scanId}
                </Link>
                <ScanStatusBadge status={scan.status} />
              </div>
            ))}
            <Link to="/scans" className="text-sm text-muted-foreground underline-offset-4 hover:underline">
              All scans
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
