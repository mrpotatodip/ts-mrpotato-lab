import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight } from "lucide-react";
import { Badge } from "#/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "#/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "#/components/ui/table";
import { scanRepoBranchesQuery } from "../hooks";
import type { ScanStatus } from "../schemas";
import { scanBranchScans, scanFailure, scanPlural } from "../utils";
import { ScanSeverityDots } from "./scan-severity-dots";
import { ScanStatusBadge } from "./scan-status-badge";
import { ScanTime } from "./scan-time";

const SHOWN = 5;

// -----
// The latest scans of the branch this scan read, laid out as the branch
// page's "Recent scans", so a person can step from one scan to the next
// without going back to the branch. The current scan is marked and is not a
// link. It shows nothing for a one-off scan (no branch), for a branch with no
// other scan, and while it loads: a card that may never
// appear must not reserve space, or the page jumps when it goes away.
// -----
export function ScanBranchScans({ scan }: { scan: ScanStatus }) {
  const { data, isPending } = useQuery({ ...scanRepoBranchesQuery(scan.repoId), enabled: Boolean(scan.branchId) });

  if (!scan.branchId) return null;
  if (isPending || !data) return null;

  const { scans, more } = scanBranchScans(data.history, scan, SHOWN);
  if (scans.length < 2) return null;
  const branchId = scan.branchId;

  return (
    <Card>
      <CardHeader className="gap-1.5 pb-7">
        <CardTitle>Scans of this branch</CardTitle>
        <p className="max-w-prose text-sm leading-relaxed text-muted-foreground">The latest scans of {scan.branch ?? "this branch"}. Open one to read its report.</p>
      </CardHeader>
      <CardContent className="overflow-hidden p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Started</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Commit</TableHead>
              <TableHead>Findings</TableHead>
              <TableHead className="w-10">
                <span className="sr-only">Open</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {scans.map((item) => {
              const current = item.scanId === scan.scanId;
              return (
                <TableRow key={item.scanId} className="relative" aria-current={current ? "page" : undefined}>
                  <TableCell>
                    {current ? (
                      <span className="flex items-center gap-2">
                        <ScanTime value={item.createdAt} />
                        <Badge variant="secondary">This scan</Badge>
                      </span>
                    ) : (
                      <Link to="/scans/$scanId" params={{ scanId: item.scanId }} className="after:absolute after:inset-0 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                        <ScanTime value={item.createdAt} />
                      </Link>
                    )}
                  </TableCell>
                  <TableCell>
                    <ScanStatusBadge status={item.status} />
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{item.commitSha ? item.commitSha.slice(0, 7) : "-"}</TableCell>
                  <TableCell>
                    {item.summary ? (
                      <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span className="font-medium tabular-nums">{scanPlural(item.summary.total, "finding", "findings")}</span>
                        <ScanSeverityDots counts={item.summary.severity} />
                        {item.summary.new > 0 && <span className="text-xs text-muted-foreground">{item.summary.new} new</span>}
                      </span>
                    ) : item.status === "failed" ? (
                      <span className="text-sm text-status-danger">{scanFailure(item.error).title}</span>
                    ) : (
                      <span className="text-muted-foreground">{item.status === "succeeded" ? "Not recorded" : "No report"}</span>
                    )}
                  </TableCell>
                  <TableCell>{!current && <ChevronRight aria-hidden="true" className="size-4 text-muted-foreground" />}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        {more > 0 && (
          <p className="border-t px-6 py-3 text-sm leading-relaxed text-muted-foreground">
            {scanPlural(more, "older scan", "older scans")} of this branch.{" "}
            <Link to="/repos/$repoId/branches/$branchId" params={{ repoId: scan.repoId, branchId }} className="rounded-sm underline underline-offset-4 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              See the branch history
            </Link>
          </p>
        )}
      </CardContent>
    </Card>
  );
}
