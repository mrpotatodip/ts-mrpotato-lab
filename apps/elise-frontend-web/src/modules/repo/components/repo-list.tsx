import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ChevronRight, FolderGit2, GitBranch, Search } from "lucide-react";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "#/components/ui/card";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "#/components/ui/empty";
import { GithubPrivateBadge } from "#/modules/github";
import { ScanNewDialog, ScanStatusBadge, ScanTime } from "#/modules/scan";
import { ShellFilterBar, ShellListCount, ShellSearchField } from "#/modules/shell";
import { reposQuery } from "../hooks";
import { repoAttention, repoName } from "../utils";
import { RepoAddDialog } from "./repo-add-dialog";
import { RepoOpenFindings } from "./repo-open-findings";
import { RepoSummaryStrip } from "./repo-summary-strip";

const BRANCH_ROW =
  "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-6 gap-y-1 px-5 py-3 transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]";

const SEARCH_FROM = 6;

export function RepoList() {
  const { data } = useSuspenseQuery(reposQuery());
  const [search, setSearch] = useState("");
  const sorted = data.repos.toSorted((a, b) => repoAttention(b) - repoAttention(a) || (b.lastScanAt ?? "").localeCompare(a.lastScanAt ?? ""));
  const query = search.trim().toLowerCase();
  const visible = sorted.filter((repo) => query === "" || repo.canonical.toLowerCase().includes(query) || repoName(repo.url).toLowerCase().includes(query) || repo.branchNames.some((name) => name.toLowerCase().includes(query)));

  if (data.repos.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Repositories</CardTitle>
        </CardHeader>
        <CardContent className="overflow-hidden p-0">
          <Empty className="py-14">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <FolderGit2 />
              </EmptyMedia>
              <EmptyTitle>No repositories yet</EmptyTitle>
              <EmptyDescription>A repository appears here after its first scan, with every finding it has had and what happened to each.</EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <RepoAddDialog label="Add a repository" size="default" variant="default" />
              <ScanNewDialog label="Start your first audit" size="default" variant="outline" />
            </EmptyContent>
          </Empty>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <RepoSummaryStrip repos={data.repos} />
      <Card>
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-3">
          <div className="grid gap-1.5">
            <CardTitle>By repository</CardTitle>
            <p className="max-w-copy text-sm leading-relaxed text-muted-foreground">Sorted by what needs attention first: findings that came back, then the most severe.</p>
          </div>
          <div className="flex items-center gap-4">
            <ShellListCount shown={visible.length} total={sorted.length} noun="repository" plural="repositories" />
            <RepoAddDialog />
          </div>
        </CardHeader>
        <CardContent className="overflow-hidden p-0">
          {sorted.length >= SEARCH_FROM && (
            <ShellFilterBar className="justify-end">
              <ShellSearchField id="repo-search" name="search" label="Search repositories and branches by name" placeholder="Search by repository or branch" value={search} onChange={(event) => setSearch(event.target.value)} />
            </ShellFilterBar>
          )}
          {visible.length === 0 ? (
            <Empty className="py-12">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Search />
                </EmptyMedia>
                <EmptyTitle>No repositories match</EmptyTitle>
                <EmptyDescription>Check the spelling, or clear the search to see every repository.</EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button variant="outline" onClick={() => setSearch("")}>
                  Clear filters
                </Button>
              </EmptyContent>
            </Empty>
          ) : (
            <ul className="divide-y">
              {visible.map((repo) => {
                const names = repo.branchNames.length > 0 ? repo.branchNames : repo.defaultBranch ? [repo.defaultBranch] : [];
                return (
                  <li key={repo.id}>
                    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 bg-muted/40 px-5 py-3">
                      <h3 className="flex items-center gap-2 font-medium">
                        {repoName(repo.url)}
                        <GithubPrivateBadge isPrivate={repo.isPrivate} />
                      </h3>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        <span className="tabular-nums">{repo.scans} {repo.scans === 1 ? "scan" : "scans"}</span>
                        {repo.lastScanStatus && <ScanStatusBadge status={repo.lastScanStatus} />}
                        <ScanTime value={repo.lastScanAt} />
                      </div>
                    </div>
                    <ul className="divide-y divide-border/70">
                      {names.length === 0 ? (
                        <li>
                          <Link to="/repos/$repoId" params={{ repoId: repo.id }} className={BRANCH_ROW}>
                            <span className="text-sm text-muted-foreground">No branch tracked yet</span>
                            <ChevronRight aria-hidden="true" className="size-4 justify-self-end text-muted-foreground sm:col-start-3" />
                          </Link>
                        </li>
                      ) : (
                        names.map((branch) => (
                          <li key={branch}>
                            <Link to="/repos/$repoId" params={{ repoId: repo.id }} search={{ branch }} className={BRANCH_ROW}>
                              <span className="flex min-w-0 items-center gap-2">
                                <GitBranch aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
                                <span className="truncate font-mono text-sm font-medium">{branch}</span>
                                {branch === repo.defaultBranch && <Badge variant="secondary">Default</Badge>}
                              </span>
                              <span className="text-sm">{branch === repo.defaultBranch ? <RepoOpenFindings open={repo.open} /> : <span className="text-xs text-muted-foreground">Open the branch to see its findings</span>}</span>
                              <ChevronRight aria-hidden="true" className="size-4 text-muted-foreground" />
                            </Link>
                          </li>
                        ))
                      )}
                    </ul>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </>
  );
}
