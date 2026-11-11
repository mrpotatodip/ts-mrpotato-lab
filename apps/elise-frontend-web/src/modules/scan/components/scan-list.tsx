import { useState } from "react";
import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { useTable } from "@tanstack/react-table";
import { ChevronRight, ScanSearch, Search } from "lucide-react";
import { Button } from "#/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "#/components/ui/card";
import { DataTable } from "#/components/ui/data-table";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "#/components/ui/empty";
import { Tabs, TabsList, TabsTrigger } from "#/components/ui/tabs";
import { dataTableColumns, dataTableFeatures } from "#/lib/data-table";
import { ShellFilterBar, ShellListCount, ShellSearchField } from "#/modules/shell";
import { fetchScans } from "../api";
import { SCAN_MODEL_NAMES, SCAN_SKILL_OPTIONS } from "../constants";
import { scansQuery } from "../hooks";
import type { ScanState, ScanStatus } from "../schemas";
import { scanCost, scanPlural } from "../utils";
import { ScanNewDialog } from "./scan-new-dialog";
import { ScanOrigin } from "./scan-origin";
import { ScanRepoLink } from "./scan-repo-link";
import { ScanSeverityDots } from "./scan-severity-dots";
import { ScanStatusBadge } from "./scan-status-badge";
import { ScanTime } from "./scan-time";

const FILTERS = [
  { value: "all", label: "All" },
  { value: "active", label: "In progress" },
  { value: "succeeded", label: "Succeeded" },
  { value: "failed", label: "Failed" },
] as const;

type Filter = (typeof FILTERS)[number]["value"];

const matches = (filter: Filter, status: ScanState) => {
  if (filter === "all") return true;
  if (filter === "active") return status === "queued" || status === "running";
  return status === filter;
};

const labelOf = <T extends string>(options: readonly { value: T; label: string }[], value: T) => options.find((o) => o.value === value)?.label ?? value;

function FindingsCell({ scan }: { scan: ScanStatus }) {
  if (scan.status === "queued" || scan.status === "running") return <span className="text-muted-foreground">In progress</span>;
  if (scan.status === "failed") return <span className="text-muted-foreground">No report</span>;
  if (!scan.summary) return <span className="text-muted-foreground">Not recorded</span>;
  const { summary } = scan;
  if (summary.total === 0) return <span className="text-muted-foreground">None found</span>;

  return (
    <span className="grid gap-1">
      <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="font-medium tabular-nums">{scanPlural(summary.total, "finding", "findings")}</span>
        <ScanSeverityDots counts={summary.severity} />
      </span>
      {summary.needsValidation > 0 && <span className="text-xs text-status-warning">{summary.needsValidation} to check by hand</span>}
    </span>
  );
}

const column = dataTableColumns<ScanStatus>();

const columns = column.columns([
  column.display({
    id: "repository",
    header: "Repository",
    meta: { cell: "max-w-[18rem]" },
    cell: ({ row }) => (
      <>
        <ScanRepoLink scanId={row.original.scanId} repo={row.original.repo} isPrivate={row.original.isPrivate} stretch />
        <ScanOrigin scan={row.original} />
      </>
    ),
  }),
  column.display({ id: "status", header: "Status", cell: ({ row }) => <ScanStatusBadge status={row.original.status} /> }),
  column.display({ id: "findings", header: "Findings", cell: ({ row }) => <FindingsCell scan={row.original} /> }),
  column.display({
    id: "review",
    header: "Review",
    cell: ({ row }) => (
      <>
        <span className="block text-sm">{labelOf(SCAN_SKILL_OPTIONS, row.original.skill)}</span>
        <span className="block text-xs text-muted-foreground">{labelOf(SCAN_MODEL_NAMES, row.original.model)}</span>
      </>
    ),
  }),
  column.display({
    id: "cost",
    header: "Cost",
    meta: { head: "text-right", cell: "text-right tabular-nums text-muted-foreground" },
    cell: ({ row }) => (
      <>
        {row.original.usage ? scanCost(row.original.usage.costUsd) : "-"}
        {row.original.runner && <span className="block text-xs">on {row.original.runner.name}</span>}
      </>
    ),
  }),
  column.display({ id: "started", header: "Started", cell: ({ row }) => <ScanTime value={row.original.createdAt} /> }),
  column.display({
    id: "open",
    header: () => <span className="sr-only">Open</span>,
    meta: { head: "w-10" },
    cell: () => <ChevronRight aria-hidden="true" className="size-4 text-muted-foreground" />,
  }),
]);

export function ScanList() {
  const { data } = useSuspenseQuery(scansQuery());
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [older, setOlder] = useState<readonly ScanStatus[]>([]);
  const [olderCursor, setOlderCursor] = useState<string | null | undefined>(undefined);

  const loadMore = useMutation({
    mutationFn: (cursor: string) => fetchScans({ data: { cursor } }),
    onSuccess: (page) => {
      setOlder((current) => [...current, ...page.scans]);
      setOlderCursor(page.nextCursor);
    },
  });

  const nextCursor = olderCursor === undefined ? data.nextCursor : olderCursor;
  const firstIds = new Set(data.scans.map((scan) => scan.scanId));
  const all = [...data.scans, ...older.filter((scan) => !firstIds.has(scan.scanId))];
  const query = search.trim().toLowerCase();
  const visible = all.filter((scan) => matches(filter, scan.status) && (query === "" || [scan.repo, scan.branch, scan.commitSha].some((field) => (field ?? "").toLowerCase().includes(query))));
  const count = (value: Filter) => all.filter((scan) => matches(value, scan.status)).length;
  const table = useTable({ features: dataTableFeatures, columns, data: visible, getRowId: (scan) => scan.scanId });

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>All scans</CardTitle>
        <ShellListCount shown={visible.length} total={all.length} more={Boolean(nextCursor)} noun="scan" plural="scans" />
      </CardHeader>
      {all.length === 0 ? (
        <CardContent className="overflow-hidden p-0">
          <Empty className="py-14">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <ScanSearch />
              </EmptyMedia>
              <EmptyTitle>No scans yet</EmptyTitle>
              <EmptyDescription>Run your first audit and its report will show up here.</EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <ScanNewDialog label="Start your first audit" size="default" />
            </EmptyContent>
          </Empty>
        </CardContent>
      ) : (
        <CardContent className="overflow-hidden p-0">
          <ShellFilterBar>
            <Tabs
              value={filter}
              onValueChange={(value) => {
                const next = FILTERS.find((item) => item.value === value);
                if (next) setFilter(next.value);
              }}
            >
              <TabsList aria-label="Filter scans by status">
                {FILTERS.map((item) => (
                  <TabsTrigger key={item.value} value={item.value}>
                    {item.label}
                    <span className="tabular-nums opacity-80">{count(item.value)}</span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
            <ShellSearchField id="scan-search" name="search" label="Search scans by repository, branch or commit" placeholder="Search by repository, branch or commit" value={search} onChange={(event) => setSearch(event.target.value)} />
          </ShellFilterBar>
          {visible.length === 0 ? (
            <Empty className="py-12">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Search />
                </EmptyMedia>
                <EmptyTitle>No scans match</EmptyTitle>
                <EmptyDescription>
                  {nextCursor ? "Only the scans loaded so far were searched. Load older scans, or change the filter." : "Try a different status or clear the search to see every scan."}
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button
                  variant="outline"
                  onClick={() => {
                    setFilter("all");
                    setSearch("");
                  }}
                >
                  Clear filters
                </Button>
              </EmptyContent>
            </Empty>
          ) : (
            <DataTable table={table} rowProps={() => ({ className: "relative" })} />
          )}
          {nextCursor && (
            <div className="flex flex-col items-center gap-2 border-t p-4">
              {loadMore.isError && <p role="alert" className="text-xs text-status-danger">We could not load more scans. Try again.</p>}
              <Button variant="outline" size="sm" disabled={loadMore.isPending} onClick={() => loadMore.mutate(nextCursor)}>
                {loadMore.isPending ? "Loading" : "Load more scans"}
              </Button>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
