import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useTable } from "@tanstack/react-table";
import { ChevronRight } from "lucide-react";
import { Badge } from "#/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "#/components/ui/card";
import { DataTable } from "#/components/ui/data-table";
import { dataTableColumns, dataTableFeatures } from "#/lib/data-table";
import { scanRepoBranchesQuery } from "../hooks";
import type { ScanStatus } from "../schemas";
import { scanBranchScans, scanFailure, scanPlural } from "../utils";
import { ScanSeverityDots } from "./scan-severity-dots";
import { ScanStatusBadge } from "./scan-status-badge";
import { ScanTime } from "./scan-time";

const SHOWN = 5;

type BranchScanRow = ScanStatus & { current: boolean };

const column = dataTableColumns<BranchScanRow>();

const columns = column.columns([
  column.display({
    id: "started",
    header: "Started",
    cell: ({ row }) =>
      row.original.current ? (
        <span className="flex items-center gap-2">
          <ScanTime value={row.original.createdAt} />
          <Badge variant="secondary">This scan</Badge>
        </span>
      ) : (
        <Link to="/scans/$scanId" params={{ scanId: row.original.scanId }} className="after:absolute after:inset-0 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <ScanTime value={row.original.createdAt} />
        </Link>
      ),
  }),
  column.display({ id: "status", header: "Status", cell: ({ row }) => <ScanStatusBadge status={row.original.status} /> }),
  column.display({
    id: "commit",
    header: "Commit",
    meta: { cell: "font-mono text-xs text-muted-foreground" },
    cell: ({ row }) => (row.original.commitSha ? row.original.commitSha.slice(0, 7) : "-"),
  }),
  column.display({
    id: "findings",
    header: "Findings",
    cell: ({ row }) => {
      const item = row.original;
      if (item.summary) {
        return (
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="font-medium tabular-nums">{scanPlural(item.summary.total, "finding", "findings")}</span>
            <ScanSeverityDots counts={item.summary.severity} />
            {item.summary.new > 0 && <span className="text-xs text-muted-foreground">{item.summary.new} new</span>}
          </span>
        );
      }
      if (item.status === "failed") return <span className="text-sm text-status-danger">{scanFailure(item.error).title}</span>;
      return <span className="text-muted-foreground">{item.status === "succeeded" ? "Not recorded" : "No report"}</span>;
    },
  }),
  column.display({
    id: "open",
    header: () => <span className="sr-only">Open</span>,
    meta: { head: "w-10" },
    cell: ({ row }) => (row.original.current ? null : <ChevronRight aria-hidden="true" className="size-4 text-muted-foreground" />),
  }),
]);

function BranchScansTable({ rows }: { rows: BranchScanRow[] }) {
  const table = useTable({ features: dataTableFeatures, columns, data: rows, getRowId: (item) => item.scanId });

  return <DataTable table={table} rowProps={(row) => ({ className: "relative", "aria-current": row.original.current ? "page" : undefined })} />;
}

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
  const rows = scans.map((item) => ({ ...item, current: item.scanId === scan.scanId }));

  return (
    <Card>
      <CardHeader className="gap-1.5 pb-7">
        <CardTitle>Scans of this branch</CardTitle>
        <p className="max-w-copy text-sm leading-relaxed text-muted-foreground">The latest scans of {scan.branch ?? "this branch"}. Open one to read its report.</p>
      </CardHeader>
      <CardContent className="overflow-hidden p-0">
        <BranchScansTable rows={rows} />
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
