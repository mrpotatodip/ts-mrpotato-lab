import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useTable } from "@tanstack/react-table";
import { ChevronRight, ShieldCheck } from "lucide-react";
import { Badge } from "#/components/ui/badge";
import { DataTable } from "#/components/ui/data-table";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "#/components/ui/empty";
import { dataTableColumns, dataTableFeatures } from "#/lib/data-table";
import { cn } from "#/lib/utils";
import { SCAN_FINDING_STATE_COPY } from "../constants";
import { scanFindingsQuery } from "../hooks";
import { SEVERITIES, type Finding } from "../schemas";
import { scanFindingsPrompt } from "../utils";
import { ScanFindingCopy } from "./scan-finding-copy";
import { ScanFindingSheet } from "./scan-finding-sheet";
import { ScanSeverityBadge } from "./scan-severity-badge";

const RANK = new Map<string | null, number>([...SEVERITIES.map((s, i) => [s, i] as const), [null, SEVERITIES.length]]);

type FindingRow = { finding: Finding; selected: boolean; open: () => void };

const column = dataTableColumns<FindingRow>();

const columns = column.columns([
  column.display({ id: "severity", header: "Severity", cell: ({ row }) => <ScanSeverityBadge severity={row.original.finding.severity} /> }),
  column.display({
    id: "finding",
    header: "Finding",
    meta: { head: "w-[42%]" },
    cell: ({ row }) => {
      const { finding, open } = row.original;
      if (!finding.detail) return <span className="font-medium">{finding.title}</span>;
      return (
        <button
          type="button"
          aria-haspopup="dialog"
          onClick={open}
          className="min-h-6 rounded-sm text-left font-medium after:absolute after:inset-0 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {finding.title}
        </button>
      );
    },
  }),
  column.display({
    id: "where",
    header: "Where",
    meta: { cell: "font-mono text-xs text-muted-foreground [overflow-wrap:normal]" },
    cell: ({ row }) => (row.original.finding.place ? `${row.original.finding.place.file}:${row.original.finding.place.line}` : "-"),
  }),
  column.display({
    id: "status",
    header: "Status",
    cell: ({ row }) => {
      const { state } = row.original.finding;
      return <Badge variant={state === "confirmed" ? "success" : state === "needs_validation" ? "warning" : "neutral"}>{SCAN_FINDING_STATE_COPY[state].label}</Badge>;
    },
  }),
  column.display({
    id: "open",
    header: () => <span className="sr-only">Open</span>,
    meta: { head: "w-10" },
    cell: ({ row }) => (row.original.finding.detail ? <ChevronRight aria-hidden="true" className="size-4 text-muted-foreground" /> : null),
  }),
]);

function ScanFindingDecisionLink({ repoId }: { repoId: string | undefined }) {
  if (!repoId) return null;
  return (
    <p className="text-xs text-muted-foreground">
      Decide whether to fix, dismiss or accept it on the{" "}
      <Link
        to="/repos/$repoId"
        params={{ repoId }}
        className="rounded-sm font-medium text-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        repository page
      </Link>
      .
    </p>
  );
}

type ScanFindingsTableProps = { scanId: string; repoId?: string; repoLabel?: string; commit?: string };

export function ScanFindingsTable({ scanId, repoId, repoLabel, commit }: ScanFindingsTableProps) {
  const { data } = useSuspenseQuery(scanFindingsQuery(scanId));
  const [selected, setSelected] = useState<number | undefined>();
  const sorted = data.toSorted((a, b) => (RANK.get(a.severity) ?? 0) - (RANK.get(b.severity) ?? 0));
  const rows = sorted.map((finding, index) => ({ finding, selected: index === selected, open: () => setSelected(index) }));
  const table = useTable({ features: dataTableFeatures, columns, data: rows, getRowId: (_, index) => String(index) });

  if (data.length === 0) {
    return (
      <Empty className="py-12">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <ShieldCheck />
          </EmptyMedia>
          <EmptyTitle>No findings recorded</EmptyTitle>
          <EmptyDescription>The scan finished without reporting a problem. That is not proof the code is safe: it only covers what the review looked at.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  const actionable = sorted.filter((f) => f.state !== "rejected");

  return (
    <>
      {actionable.length > 0 && (
        <div className="flex justify-end border-b px-5 py-3">
          <ScanFindingCopy text={scanFindingsPrompt(sorted, { repo: repoLabel, commit })} label={`Copy ${actionable.length === 1 ? "finding" : `all ${actionable.length} findings`} for coding agent`} />
        </div>
      )}
      <DataTable table={table} rowProps={(row) => ({ className: cn("relative", row.original.selected && "bg-accent") })} />
      <ScanFindingSheet
        findings={sorted}
        selected={selected}
        onSelect={setSelected}
        decision={<ScanFindingDecisionLink repoId={repoId} />}
      />
    </>
  );
}
