import { useState } from "react";
import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { ChevronRight, ScanSearch, Search } from "lucide-react";
import { Button } from "#/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "#/components/ui/card";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "#/components/ui/empty";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "#/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "#/components/ui/table";
import { fetchScans } from "../api";
import { SCAN_MODEL_OPTIONS, SCAN_SKILL_OPTIONS } from "../constants";
import { scansQuery } from "../hooks";
import type { ScanState, ScanStatus } from "../schemas";
import { scanCost, scanPlural } from "../utils";
import { ScanNewDialog } from "./scan-new-dialog";
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
  const visible = all.filter((scan) => matches(filter, scan.status) && (query === "" || (scan.repo ?? "").toLowerCase().includes(query)));
  const count = (value: Filter) => all.filter((scan) => matches(value, scan.status)).length;
  const total = `${all.length}${nextCursor ? "+" : ""}`;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>All scans</CardTitle>
        <span className="text-xs tabular-nums text-muted-foreground">
          {visible.length === all.length ? `${total} ${all.length === 1 && !nextCursor ? "scan" : "scans"}` : `${visible.length} of ${total} scans`}
        </span>
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
          <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-3">
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
            <div className="relative w-full sm:w-72">
              <Label htmlFor="scan-search" className="sr-only">
                Search scans by owner or repository
              </Label>
              <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="scan-search"
                name="search"
                type="search"
                autoComplete="off"
                placeholder="Search by owner or repository"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="h-9 pl-9"
              />
            </div>
          </div>
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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Repository</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Findings</TableHead>
                  <TableHead>Review</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                  <TableHead>Started</TableHead>
                  <TableHead className="w-10">
                    <span className="sr-only">Open</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.map((scan) => (
                  <TableRow key={scan.scanId} className="relative">
                    <TableCell className="max-w-[18rem]">
                      <ScanRepoLink scanId={scan.scanId} repo={scan.repo} stretch />
                    </TableCell>
                    <TableCell>
                      <ScanStatusBadge status={scan.status} />
                    </TableCell>
                    <TableCell>
                      <FindingsCell scan={scan} />
                    </TableCell>
                    <TableCell>
                      <span className="block text-sm">{labelOf(SCAN_SKILL_OPTIONS, scan.skill)}</span>
                      <span className="block text-xs text-muted-foreground">{labelOf(SCAN_MODEL_OPTIONS, scan.model)}</span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">{scan.usage ? scanCost(scan.usage.costUsd) : "-"}</TableCell>
                    <TableCell>
                      <ScanTime value={scan.createdAt} />
                    </TableCell>
                    <TableCell>
                      <ChevronRight aria-hidden="true" className="size-4 text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {nextCursor && (
            <div className="flex flex-col items-center gap-2 border-t p-4">
              {loadMore.isError && <p role="alert" className="text-xs text-status-danger">We could not load older scans. Try again.</p>}
              <Button variant="outline" size="sm" disabled={loadMore.isPending} onClick={() => loadMore.mutate(nextCursor)}>
                {loadMore.isPending ? "Loading" : "Load older scans"}
              </Button>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
