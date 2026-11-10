import { Suspense, useState, type ComponentProps } from "react";
import { Link } from "@tanstack/react-router";
import { useQueryClient, useSuspenseInfiniteQuery, useSuspenseQuery } from "@tanstack/react-query";
import { useTable } from "@tanstack/react-table";
import { ChevronRight, CircleAlert, ExternalLink, GitBranch, Search, ShieldCheck, Undo2 } from "lucide-react";
import { Alert, AlertDescription } from "#/components/ui/alert";
import { Button } from "#/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "#/components/ui/card";
import { DataTable } from "#/components/ui/data-table";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "#/components/ui/empty";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "#/components/ui/select";
import { Skeleton } from "#/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "#/components/ui/tooltip";
import { dataTableColumns, dataTableFeatures } from "#/lib/data-table";
import { cn } from "#/lib/utils";
import { GithubPrivateBadge } from "#/modules/github";
import { ShellPageHeader } from "#/modules/shell";
import { FindingDecisionNote, FindingLocation, FindingStatusBadge, FindingStatusBanner, FindingTriageSelect, findingGroup } from "#/modules/finding";
import { ScanFindingSheet, ScanNewDialog, ScanSeverityBadge, ScanSeverityDots, ScanStatusBadge, ScanTime, ScanVerdictCard, fromRecorded, scanFailure, scanPlural, type ScanStatus } from "#/modules/scan";
import { repoFindingsQuery, repoKeys, repoQuery } from "../hooks";
import type { RepoFinding } from "../schemas";
import { repoName } from "../utils";
import { RepoBranchSwitch } from "./repo-branch-switch";
import { RepoVerdictDecision } from "./repo-verdict-decision";

const RECENT_SCAN_COUNT = 3;

const unratedOf = (summary: { total: number; severity: Record<string, number> }) => summary.total - Object.values(summary.severity).reduce((sum, count) => sum + count, 0);

type FindingFilter = "action" | "decided" | "scan" | "all";

const FILTER_VALUES = ["action", "decided", "scan", "all"] as const satisfies readonly FindingFilter[];

const FILTER_COPY = {
  action: { label: "Needs action", note: "A scan still sees these and nobody has resolved them." },
  decided: { label: "Decided by a person", note: "Marked fixed, dismissed or accepted by someone on your team. A scan has not confirmed a fix yet." },
  scan: { label: "Fixed by a scan", note: "A scan checked the code and the problem is gone." },
  all: { label: "Every finding", note: "Every finding this branch has had." },
} as const satisfies Record<FindingFilter, { label: string; note: string }>;

const EMPTY_COPY = {
  action: { title: "Nothing needs action", text: "Every finding is fixed, dismissed or accepted. That is not proof the code is safe: only the latest scan's findings are checked." },
  decided: { title: "No one has decided anything yet", text: "When someone marks a finding fixed, dismisses it or accepts the risk, it appears here." },
  scan: { title: "No scan has confirmed a fix yet", text: "A finding moves here when a later scan checks the code and the problem is gone." },
  all: { title: "No findings", text: "Run a scan to check this repository." },
} as const satisfies Record<FindingFilter, { title: string; text: string }>;

const asFilter = (value: string | null): FindingFilter => FILTER_VALUES.find((filter) => filter === value) ?? "action";

// -----
// Open findings already show in the verdict above, so the history
// opens on what people decided, then on what a scan fixed, then on
// everything when neither has any.
// -----
const firstFilledFilter = (findings: readonly RepoFinding[]): FindingFilter =>
  (["decided", "scan"] as const).find((value) => findings.some((f) => findingGroup(f.state, f.triage) === value)) ?? "all";

function ScanLink({ scanId, history }: { scanId: string; history: readonly ScanStatus[] }) {
  const scan = history.find((item) => item.scanId === scanId);
  return (
    <Link to="/scans/$scanId" params={{ scanId }} className="inline-flex min-h-6 items-center rounded-sm underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      {scan ? <ScanTime value={scan.createdAt} /> : "Open the scan"}
    </Link>
  );
}

function SheetFact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid content-start gap-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium [overflow-wrap:anywhere]">{children}</dd>
    </div>
  );
}

const fixedOnOf = (finding: RepoFinding, history: readonly ScanStatus[]) => history.find((scan) => scan.scanId === finding.fixedInScanId)?.createdAt ?? null;

function RepoFindingFacts({ finding, history }: { finding: RepoFinding; history: readonly ScanStatus[] }) {
  return (
    <>
      <SheetFact label="First seen in">
        <ScanLink scanId={finding.firstSeenScanId} history={history} />
      </SheetFact>
      {finding.fixedInScanId && (
        <SheetFact label="Fixed in">
          <ScanLink scanId={finding.fixedInScanId} history={history} />
        </SheetFact>
      )}
      {finding.unchecked && <SheetFact label="Latest scan">It did not re-check this finding. Treat it as still open until a scan confirms.</SheetFact>}
      {finding.possibleDuplicateOf && <SheetFact label="Possible duplicate">It may repeat another finding in this repository.</SheetFact>}
    </>
  );
}

type FindingRow = {
  finding: RepoFinding;
  selected: boolean;
  open: () => void;
  repoId: string;
  fixedOn: string | null;
  onSaved: ComponentProps<typeof FindingTriageSelect>["onSaved"];
};

const findingColumn = dataTableColumns<FindingRow>();

const severityColumn = findingColumn.display({
  id: "severity",
  header: "Severity",
  meta: { head: "whitespace-nowrap" },
  cell: ({ row }) => <ScanSeverityBadge severity={row.original.finding.severity} />,
});

const titleColumn = findingColumn.display({
  id: "finding",
  header: "Finding",
  meta: { head: "w-[36%]" },
  cell: ({ row }) => (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        onClick={row.original.open}
        className="rounded-sm text-left font-medium after:absolute after:inset-0 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {row.original.finding.title}
      </button>
      {row.original.finding.unchecked && <p className="mt-1 text-sm leading-relaxed text-muted-foreground">Not re-checked in the latest scan</p>}
    </>
  ),
});

const statusColumn = findingColumn.display({
  id: "status",
  header: "Status",
  cell: ({ row }) => <FindingStatusBadge state={row.original.finding.state} triage={row.original.finding.triage} />,
});

const whereColumn = findingColumn.display({
  id: "where",
  header: "Where",
  meta: { cell: "max-w-[18rem]" },
  cell: ({ row }) => <FindingLocation file={row.original.finding.file} line={row.original.finding.line} />,
});

const decisionColumn = findingColumn.display({
  id: "decision",
  header: "Your decision",
  meta: { cell: "relative z-10" },
  cell: ({ row }) => {
    const { finding, repoId, fixedOn, onSaved } = row.original;
    return (
      <span className="grid justify-items-start gap-1.5">
        {finding.state !== "fixed_by_code" && <FindingTriageSelect finding={finding} also={[repoKeys.detail(repoId)]} onSaved={onSaved} />}
        <FindingDecisionNote state={finding.state} triage={finding.triage} fixedOn={fixedOn} />
      </span>
    );
  },
});

const openColumn = findingColumn.display({
  id: "open",
  header: () => <span className="sr-only">Open</span>,
  meta: { head: "w-10" },
  cell: () => <ChevronRight aria-hidden="true" className="size-4 text-muted-foreground" />,
});

const findingColumnsWithStatus = findingColumn.columns([severityColumn, titleColumn, statusColumn, whereColumn, decisionColumn, openColumn]);
const findingColumnsWithoutStatus = findingColumn.columns([severityColumn, titleColumn, whereColumn, decisionColumn, openColumn]);

type RecentScanRow = ScanStatus & { oneOff: boolean };

const scanColumn = dataTableColumns<RecentScanRow>();

const recentScanColumns = scanColumn.columns([
  scanColumn.display({
    id: "started",
    header: "Started",
    cell: ({ row }) => (
      <Link to="/scans/$scanId" params={{ scanId: row.original.scanId }} className="after:absolute after:inset-0 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <ScanTime value={row.original.createdAt} />
      </Link>
    ),
  }),
  scanColumn.display({ id: "status", header: "Status", cell: ({ row }) => <ScanStatusBadge status={row.original.status} /> }),
  scanColumn.display({
    id: "commit",
    header: "Commit",
    meta: { cell: "font-mono text-xs text-muted-foreground" },
    cell: ({ row }) => (
      <>
        {row.original.commitSha ? row.original.commitSha.slice(0, 7) : "-"}
        {row.original.oneOff && <span className="ml-2 font-sans" title="A one-off scan of this commit. Its findings count toward the commit's answer but are not added to the branch's findings.">one-off scan</span>}
      </>
    ),
  }),
  scanColumn.display({
    id: "findings",
    header: "Findings",
    cell: ({ row }) => {
      const scan = row.original;
      if (scan.summary) {
        return (
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="font-medium tabular-nums">{scanPlural(scan.summary.total, "finding", "findings")}</span>
            <ScanSeverityDots counts={scan.summary.severity} />
            {unratedOf(scan.summary) > 0 && <span className="text-xs text-muted-foreground">{unratedOf(scan.summary)} unrated</span>}
            {scan.summary.new > 0 && <span className="text-xs text-muted-foreground">{scan.summary.new} new</span>}
          </span>
        );
      }
      if (scan.status === "failed") return <span className="text-sm text-status-danger">{scanFailure(scan.error).title}</span>;
      return <span className="text-muted-foreground">{scan.status === "succeeded" ? "Not recorded" : "No report"}</span>;
    },
  }),
  scanColumn.display({
    id: "open",
    header: () => <span className="sr-only">Open</span>,
    meta: { head: "w-10" },
    cell: () => <ChevronRight aria-hidden="true" className="size-4 text-muted-foreground" />,
  }),
]);

function RepoFindings({ repoId, branch, history }: { repoId: string; branch: string; history: readonly ScanStatus[] }) {
  const queryClient = useQueryClient();
  const findingsOptions = repoFindingsQuery(repoId, { branch });
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useSuspenseInfiniteQuery(findingsOptions);
  const [filter, setFilter] = useState<FindingFilter>(() => firstFilledFilter(data.pages.flatMap((page) => page.findings)));
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<number | undefined>();
  const decided = (fingerprint: string, triage: RepoFinding["triage"]) =>
    queryClient.setQueryData(findingsOptions.queryKey, (old) => old && { ...old, pages: old.pages.map((page) => ({ ...page, findings: page.findings.map((f) => (f.fingerprint === fingerprint ? { ...f, triage } : f)) })) });
  const all = data.pages.flatMap((page) => page.findings);
  const more = hasNextPage ? "+" : "";
  const countOf = (value: FindingFilter) => (value === "all" ? all.length : all.filter((f) => findingGroup(f.state, f.triage) === value).length);
  const filterItems = FILTER_VALUES.map((value) => ({ value, label: `${FILTER_COPY[value].label} (${countOf(value)}${more})` }));
  const inGroup = filter === "all" ? all : all.filter((f) => findingGroup(f.state, f.triage) === filter);
  const query = search.trim().toLowerCase();
  const findings = query === "" ? inGroup : inGroup.filter((f) => [f.title, f.file ?? "", f.class].some((text) => text.toLowerCase().includes(query)));
  const selectedFinding = selected === undefined ? undefined : findings[selected];
  const showStatus = filter === "action" || filter === "all";
  const rows = findings.map((finding, index) => ({ finding, selected: index === selected, open: () => setSelected(index), repoId, fixedOn: fixedOnOf(finding, history), onSaved: decided }));
  const table = useTable({ features: dataTableFeatures, columns: showStatus ? findingColumnsWithStatus : findingColumnsWithoutStatus, data: rows, getRowId: (row) => row.finding.id });

  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-3 pb-7">
        <div className="grid max-w-xl gap-1.5">
          <CardTitle>Findings history</CardTitle>
          <p className="max-w-copy text-sm leading-relaxed text-muted-foreground">
            {FILTER_COPY[filter].note}
            {findings.length > 0 ? (filter === "action" ? " Select a row for the impact, evidence and fix, and record your decision." : " Select a row to read the impact, evidence and fix.") : ""}
          </p>
        </div>
        <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
          <div className="relative w-full sm:w-64">
            <Label htmlFor="repo-finding-search" className="sr-only">
              Search this repository's findings by title, file or type
            </Label>
            <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input id="repo-finding-search" name="search" type="search" autoComplete="off" placeholder="Search findings" value={search} onChange={(event) => setSearch(event.target.value)} className="pl-9" />
          </div>
          <Select value={filter} items={filterItems} onValueChange={(next) => setFilter(asFilter(next))}>
            <SelectTrigger aria-label="Show findings" className="h-9 w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {filterItems.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="overflow-hidden p-0">
        {findings.length === 0 ? (
          <Empty className="py-10">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <ShieldCheck />
              </EmptyMedia>
              <EmptyTitle>{query !== "" ? "No findings match" : EMPTY_COPY[filter].title}</EmptyTitle>
              <EmptyDescription>
                {query !== "" ? (hasNextPage ? "Only the findings loaded so far were searched. Load more, or clear the search." : "Try different words, or clear the search.") : EMPTY_COPY[filter].text}
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              {query !== "" ? (
                <Button variant="outline" onClick={() => setSearch("")}>
                  Clear search
                </Button>
              ) : (
                filter !== "all" && (
                  <Button variant="outline" onClick={() => setFilter("all")}>
                    Show every finding
                  </Button>
                )
              )}
            </EmptyContent>
          </Empty>
        ) : (
          <DataTable table={table} rowProps={(row) => ({ className: cn("relative", row.original.selected && "bg-accent") })} />
        )}
        {hasNextPage && (
          <div className="flex justify-center border-t p-3">
            <Button variant="outline" size="sm" disabled={isFetchingNextPage} onClick={() => void fetchNextPage()}>
              {isFetchingNextPage ? "Loading" : "Load more findings"}
            </Button>
          </div>
        )}
      </CardContent>
      <ScanFindingSheet
        findings={findings.map(fromRecorded)}
        selected={selectedFinding ? selected : undefined}
        onSelect={setSelected}
        status={selectedFinding && <FindingStatusBanner state={selectedFinding.state} triage={selectedFinding.triage} fixedOn={fixedOnOf(selectedFinding, history)} />}
        facts={selectedFinding && <RepoFindingFacts finding={selectedFinding} history={history} />}
        decision={
          selectedFinding &&
          (selectedFinding.state === "fixed_by_code" ? (
            <p className="text-sm text-muted-foreground">No decision is needed: a scan confirmed the fix.</p>
          ) : (
            <>
              <span className="text-sm font-medium">Your decision</span>
              <FindingTriageSelect finding={selectedFinding} also={[repoKeys.detail(repoId)]} onSaved={decided} />
            </>
          ))
        }
      />
    </Card>
  );
}

type FactProps ={ label: string; children: React.ReactNode };

function Fact({ label, children }: FactProps) {
  return (
    <div className="grid gap-1">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium">{children}</dd>
    </div>
  );
}

export function RepoDetail({ repoId, branchId }: { repoId: string; branchId?: string }) {
  const { data: repo } = useSuspenseQuery(repoQuery(repoId));
  const oldest = repo.history.at(-1);
  const current = repo.branches.find((branch) => branch.id === branchId);
  const open = current?.open ?? repo.open;
  const branchCommits = new Set(repo.history.filter((scan) => current && scan.branchId === current.id && scan.commitSha).map((scan) => scan.commitSha));
  const pinnedToBranch = (scan: ScanStatus) => !scan.branchId && scan.commitSha != null && branchCommits.has(scan.commitSha);
  const branchScans = current ? repo.history.filter((scan) => scan.branchId === current.id || (current.isDefault && !scan.branchId && !scan.ref) || pinnedToBranch(scan)) : repo.history;
  const otherScans = repo.history.length - branchScans.length;
  const recentScans = branchScans.slice(0, RECENT_SCAN_COUNT);
  const olderScans = branchScans.length - recentScans.length;
  const newestScan = branchScans[0];
  const github = repo.url.replace(/\.git$/, "").replace(/\/$/, "");
  const recentRows = recentScans.map((scan) => ({ ...scan, oneOff: Boolean(current && !scan.branchId && scan.commitSha) }));
  const recentTable = useTable({ features: dataTableFeatures, columns: recentScanColumns, data: recentRows, getRowId: (scan) => scan.scanId });

  return (
    <>
      <ShellPageHeader
        title={repoName(repo.url)}
        badges={<GithubPrivateBadge isPrivate={repo.isPrivate} />}
        below={
          <div className="grid gap-3">
            {current && (
              <div className="flex min-w-0 items-center gap-2">
                <RepoBranchSwitch repoId={repoId} branches={repo.branches} current={current} />
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <a
                        href={`${github}/tree/${encodeURI(current.name)}`}
                        target="_blank"
                        rel="noreferrer"
                        aria-label="Open this branch on GitHub"
                        className="inline-flex size-9 shrink-0 items-center justify-center rounded-md border bg-card text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      />
                    }
                  >
                    <ExternalLink aria-hidden="true" className="size-4" />
                  </TooltipTrigger>
                  <TooltipContent>Open this branch on GitHub</TooltipContent>
                </Tooltip>
              </div>
            )}
            {current ? (
              <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm leading-relaxed text-muted-foreground">
                {newestScan ? (
                  <>
                    <ScanStatusBadge status={newestScan.status} />
                    <span>
                      Last scan <ScanTime value={newestScan.createdAt} />
                    </span>
                  </>
                ) : (
                  <span>Never scanned</span>
                )}
                <span aria-hidden="true">·</span>
                <span>{scanPlural(branchScans.length, "scan", "scans")} of this branch</span>
              </p>
            ) : (
              <dl className="grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-3">
                <Fact label="Scans">{repo.scans}</Fact>
                <Fact label="Latest scan">
                  <span className="flex flex-wrap items-center gap-2">
                    {repo.lastScanStatus && <ScanStatusBadge status={repo.lastScanStatus} />}
                    <ScanTime value={repo.lastScanAt} />
                  </span>
                </Fact>
                <Fact label="First scanned">
                  <ScanTime value={oldest?.createdAt} />
                </Fact>
              </dl>
            )}
          </div>
        }
      >
        {!current && (
          <a
            href={github}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-6 items-center gap-1.5 rounded-sm text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ExternalLink aria-hidden="true" className="size-3.5" />
            Open on GitHub
          </a>
        )}
        <ScanNewDialog label={current ? "Scan this branch" : "Scan"} size="default" repo={repo.url} startBranch={current?.name} />
      </ShellPageHeader>

      {current?.latestCommit && <ScanVerdictCard repoId={repoId} commit={current.latestCommit} repoUrl={repo.url} scope="branch" branchOpen={open.total} Decision={RepoVerdictDecision} />}

      {open.regressed > 0 && (
        <Alert variant="destructive">
          <Undo2 />
          <AlertDescription>
            <span className="font-medium">{scanPlural(open.regressed, "problem came", "problems came")} back after being fixed.</span> A scan reported {open.regressed === 1 ? "it" : "them"} again. Find the change that brought {open.regressed === 1 ? "it" : "them"} back.
          </AlertDescription>
        </Alert>
      )}
      {open.unchecked > 0 && (
        <Alert variant="warning">
          <CircleAlert />
          <AlertDescription>
            <span className="font-medium">{scanPlural(open.unchecked, "open problem was", "open problems were")} not re-checked by the latest scan.</span> Treat {open.unchecked === 1 ? "it" : "them"} as still open.
          </AlertDescription>
        </Alert>
      )}

      {current ? (
        <Suspense key={current.name} fallback={<Skeleton className="h-56 w-full" />}>
          <RepoFindings repoId={repoId} branch={current.name} history={repo.history} />
        </Suspense>
      ) : (
        <Card>
          <CardContent className="py-10">
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <GitBranch />
                </EmptyMedia>
                <EmptyTitle>No branch tracked yet</EmptyTitle>
                <EmptyDescription>Run a scan of this repository to read its default branch, or add the repository again from the repository list with the branch names to track.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="gap-1.5 pb-7">
          <CardTitle>Recent scans</CardTitle>
          <p className="max-w-copy text-sm leading-relaxed text-muted-foreground">
            The latest {current ? "scans of this branch" : "scans of this repository"}. Open one for its report and what changed.
          </p>
        </CardHeader>
        <CardContent className="overflow-hidden p-0">
          <DataTable table={recentTable} rowProps={() => ({ className: "relative" })} />
          {(olderScans > 0 || otherScans > 0) && (
            <p className="border-t px-6 py-3 text-sm leading-relaxed text-muted-foreground">
              {olderScans > 0 && `${scanPlural(olderScans, "older scan", "older scans")} of this ${current ? "branch" : "repository"}. `}
              {otherScans > 0 && `${scanPlural(otherScans, "scan", "scans")} of other branches, tags or commits. `}
              <Link to="/scans" className="rounded-sm underline underline-offset-4 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                See every scan
              </Link>
            </p>
          )}
        </CardContent>
      </Card>
    </>
  );
}
