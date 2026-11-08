import { Suspense, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQueryClient, useSuspenseInfiniteQuery, useSuspenseQuery } from "@tanstack/react-query";
import { ChevronRight, CircleAlert, ExternalLink, FolderGit2, GitBranch, History, Search, ShieldCheck, Undo2 } from "lucide-react";
import { Button } from "#/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "#/components/ui/card";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "#/components/ui/empty";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "#/components/ui/select";
import { Skeleton } from "#/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "#/components/ui/table";
import { cn } from "#/lib/utils";
import { FindingDecisionNote, FindingLocation, FindingStatusBadge, FindingStatusBanner, FindingTriageSelect, findingGroup } from "#/modules/finding";
import { ScanFindingSheet, ScanNewDialog, ScanSeverityBadge, ScanSeverityDots, ScanStatusBadge, ScanTime, fromRecorded, scanCost, scanDuration, scanFailure, scanPlural, type ScanStatus } from "#/modules/scan";
import { ShellStatTile } from "#/modules/shell";
import { repoFindingsQuery, repoKeys, repoQuery } from "../hooks";
import type { RepoFinding } from "../schemas";
import { repoName } from "../utils";
import { RepoBranchSwitch } from "./repo-branch-switch";

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

function ScanLink({ scanId, history }: { scanId: string; history: readonly ScanStatus[] }) {
  const scan = history.find((item) => item.scanId === scanId);
  return (
    <Link to="/scans/$scanId" params={{ scanId }} className="rounded-sm underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
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

function RepoFindings({ repoId, branch, history }: { repoId: string; branch: string; history: readonly ScanStatus[] }) {
  const [filter, setFilter] = useState<FindingFilter>("action");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<number | undefined>();
  const queryClient = useQueryClient();
  const findingsOptions = repoFindingsQuery(repoId, { branch });
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useSuspenseInfiniteQuery(findingsOptions);
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

  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-3">
        <div className="grid max-w-xl gap-1.5">
          <CardTitle>
            Findings on <span className="font-mono">{branch}</span>
          </CardTitle>
          <p className="text-xs leading-relaxed text-muted-foreground">
            {FILTER_COPY[filter].note}
            {findings.length > 0 ? " Select a row for the impact, evidence and fix, and record your decision." : ""}
          </p>
        </div>
        <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
          <div className="relative w-full sm:w-64">
            <Label htmlFor="repo-finding-search" className="sr-only">
              Search this repository's findings by title, file or type
            </Label>
            <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input id="repo-finding-search" name="search" type="search" autoComplete="off" placeholder="Search findings" value={search} onChange={(event) => setSearch(event.target.value)} className="h-9 pl-9" />
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="whitespace-nowrap">Severity</TableHead>
                <TableHead className="w-[36%]">Finding</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Where</TableHead>
                <TableHead>Your decision</TableHead>
                <TableHead className="w-10">
                  <span className="sr-only">Open</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {findings.map((finding, index) => (
                <TableRow key={finding.id} className={cn("relative", index === selected && "bg-accent")}>
                  <TableCell>
                    <ScanSeverityBadge severity={finding.severity} />
                  </TableCell>
                  <TableCell>
                    <button
                      type="button"
                      aria-haspopup="dialog"
                      onClick={() => setSelected(index)}
                      className="rounded-sm text-left font-medium after:absolute after:inset-0 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {finding.title}
                    </button>
                    {finding.unchecked && <p className="mt-1 text-xs text-muted-foreground">Not re-checked in the latest scan</p>}
                  </TableCell>
                  <TableCell>
                    <FindingStatusBadge state={finding.state} triage={finding.triage} />
                  </TableCell>
                  <TableCell className="max-w-[18rem]">
                    <FindingLocation file={finding.file} line={finding.line} />
                  </TableCell>
                  <TableCell className="relative z-10">
                    <span className="grid justify-items-start gap-1.5">
                      {finding.state !== "fixed_by_code" && <FindingTriageSelect finding={finding} also={[repoKeys.detail(repoId)]} onSaved={decided} />}
                      <FindingDecisionNote state={finding.state} triage={finding.triage} fixedOn={fixedOnOf(finding, history)} />
                    </span>
                  </TableCell>
                  <TableCell>
                    <ChevronRight aria-hidden="true" className="size-4 text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
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

type FactProps = { label: string; children: React.ReactNode };

function Fact({ label, children }: FactProps) {
  return (
    <div className="grid gap-0.5">
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
  const branchScans = current ? repo.history.filter((scan) => scan.branchId === current.id || (current.isDefault && !scan.branchId && !scan.ref)) : repo.history;
  const otherScans = repo.history.length - branchScans.length;
  const latestStatus = repo.history.find((scan) => scan.scanId === current?.latestScanId)?.status;
  const github = repo.url.replace(/\.git$/, "").replace(/\/$/, "");

  return (
    <>
      <div className="grid gap-5">
        <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
          <div className="grid min-w-0 gap-2.5">
            <h1 className="text-[26px] font-semibold leading-none tracking-tight">{repoName(repo.url)}</h1>
            {current && <RepoBranchSwitch repoId={repoId} branches={repo.branches} current={current} />}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <a
              href={current ? `${github}/tree/${encodeURI(current.name)}` : github}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-sm text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ExternalLink aria-hidden="true" className="size-3.5" />
              {current ? "Open branch on GitHub" : "Open on GitHub"}
            </a>
            <ScanNewDialog label={current ? "Scan this branch" : "Scan"} variant="outline" repo={repo.url} startBranch={current?.name} />
          </div>
        </div>
        <dl className="grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-3">
          {current ? (
            <>
              <Fact label="Latest scan of this branch">
                {current.latestScanAt ? (
                  <span className="flex flex-wrap items-center gap-2">
                    {latestStatus && <ScanStatusBadge status={latestStatus} />}
                    <ScanTime value={current.latestScanAt} />
                  </span>
                ) : (
                  <span className="text-muted-foreground">Never scanned</span>
                )}
              </Fact>
              <Fact label="Commit read">
                {current.latestCommit ? (
                  <a href={`${github}/commit/${current.latestCommit}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-sm font-mono underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    {current.latestCommit.slice(0, 7)}
                    <ExternalLink aria-hidden="true" className="size-3" />
                  </a>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </Fact>
              <Fact label="Scans of this branch">{branchScans.length}</Fact>
            </>
          ) : (
            <>
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
            </>
          )}
        </dl>
      </div>

      <section aria-label="Summary" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <ShellStatTile
          label="Open findings"
          value={open.total}
          icon={FolderGit2}
          tone="bg-secondary text-foreground"
          note={open.total === 0 ? "Nothing is open in the latest scan. That is not proof the code is safe." : <span className="flex flex-wrap items-center gap-x-3 gap-y-1"><ScanSeverityDots counts={open.severity} /></span>}
        />
        <ShellStatTile
          label="Came back"
          value={open.regressed}
          icon={Undo2}
          tone={open.regressed > 0 ? "bg-status-danger-soft text-status-danger" : "bg-secondary text-foreground"}
          note={open.regressed > 0 ? "Fixed before, reported again. Find what reintroduced them." : "Nothing that was fixed has returned."}
        />
        <ShellStatTile
          label="Needs a person"
          value={open.needsValidation}
          icon={CircleAlert}
          tone={open.needsValidation > 0 ? "bg-status-warning-soft text-status-warning" : "bg-secondary text-foreground"}
          note={open.needsValidation > 0 ? "Likely but unverified. Check by hand before acting." : "Every open finding was verified."}
        />
        <ShellStatTile
          label="Not re-checked"
          value={open.unchecked}
          icon={History}
          tone="bg-secondary text-foreground"
          note={open.unchecked > 0 ? "The latest scan did not re-verify these. Treat them as still open." : "The latest scan re-checked every open finding."}
        />
      </section>

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
        <CardHeader className="gap-1.5">
          <CardTitle>Scan history</CardTitle>
          <p className="text-xs text-muted-foreground">
            {current ? "Scans of this branch" : "Every scan of this repository"}, newest first. Open one for its report and what changed.
            {otherScans > 0 && (
              <>
                {" "}
                {scanPlural(otherScans, "other scan", "other scans")} of this repository (other branches, tags or commits) {otherScans === 1 ? "is" : "are"} not listed here.{" "}
                <Link to="/scans" className="rounded-sm underline underline-offset-4 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  See every scan
                </Link>
                .
              </>
            )}
          </p>
        </CardHeader>
        <CardContent className="overflow-hidden p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Started</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Findings</TableHead>
                <TableHead className="text-right">Took</TableHead>
                <TableHead className="text-right">Cost</TableHead>
                <TableHead className="w-10">
                  <span className="sr-only">Open</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {branchScans.map((scan) => (
                <TableRow key={scan.scanId} className="relative">
                  <TableCell>
                    <Link to="/scans/$scanId" params={{ scanId: scan.scanId }} className="after:absolute after:inset-0 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                      <ScanTime value={scan.createdAt} />
                    </Link>
                  </TableCell>
                  <TableCell>
                    <ScanStatusBadge status={scan.status} />
                  </TableCell>
                  <TableCell>
                    {scan.summary ? (
                      <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span className="font-medium tabular-nums">{scanPlural(scan.summary.total, "finding", "findings")}</span>
                        <ScanSeverityDots counts={scan.summary.severity} />
                        {scan.summary.new > 0 && <span className="text-xs text-muted-foreground">{scan.summary.new} new</span>}
                      </span>
                    ) : scan.status === "failed" ? (
                      <span className="text-sm text-status-danger">{scanFailure(scan.error).title}</span>
                    ) : (
                      <span className="text-muted-foreground">{scan.status === "succeeded" ? "Not recorded" : "No report"}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">{scanDuration(scan.usage?.durationMs) ?? "-"}</TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">{scan.usage ? scanCost(scan.usage.costUsd) : "-"}</TableCell>
                  <TableCell>
                    <ChevronRight aria-hidden="true" className="size-4 text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
