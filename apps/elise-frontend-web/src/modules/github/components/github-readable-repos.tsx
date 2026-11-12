import { Suspense, useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "#/components/ui/card";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { Skeleton } from "#/components/ui/skeleton";
import { githubInstallationsQuery, githubReposQuery } from "../hooks";
import { GithubPrivateBadge } from "./github-private-badge";

const SEARCH_FROM = 6;

function GithubReadableReposView() {
  const { data: installs } = useSuspenseQuery(githubInstallationsQuery());
  const { data: repos } = useSuspenseQuery(githubReposQuery());
  const [search, setSearch] = useState("");

  if (!installs.some((install) => install.status === "active")) return null;

  const query = search.trim().toLowerCase();
  const visible = repos.filter((repo) => query === "" || repo.fullName.toLowerCase().includes(query));

  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-3">
        <div className="grid gap-1.5">
          <CardTitle>Repositories Elise can read</CardTitle>
          <p className="max-w-copy text-sm leading-relaxed text-muted-foreground">
            What the connections above let Elise scan. To add or remove one, use Manage on GitHub. Pick one when you add a repository, or when you start a scan.
          </p>
        </div>
        <span className="text-xs tabular-nums text-muted-foreground">{visible.length === repos.length ? `${repos.length} ${repos.length === 1 ? "repository" : "repositories"}` : `${visible.length} of ${repos.length}`}</span>
      </CardHeader>
      <CardContent className="overflow-hidden p-0">
        {repos.length >= SEARCH_FROM && (
          <div className="border-b px-5 py-3">
            <div className="relative w-full sm:w-72">
              <Label htmlFor="github-repo-search" className="sr-only">
                Search the repositories Elise can read
              </Label>
              <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input id="github-repo-search" name="search" type="search" autoComplete="off" placeholder="Search by name" value={search} onChange={(event) => setSearch(event.target.value)} className="h-9 pl-9" />
            </div>
          </div>
        )}
        {repos.length === 0 ? (
          <p className="px-5 py-8 text-sm text-muted-foreground">No repositories yet. Choose some on GitHub with Manage on GitHub, and they appear here.</p>
        ) : visible.length === 0 ? (
          <p className="px-5 py-8 text-sm text-muted-foreground">No repository matches “{search.trim()}”. Clear the search to see all {repos.length}.</p>
        ) : (
          <ul className="divide-y">
            {visible.map((repo) => {
              const [owner, name] = repo.fullName.split("/");
              return (
                <li key={`${repo.installationId}/${repo.fullName}`} className="flex items-center justify-between gap-4 px-5 py-3">
                  <span className="min-w-0 truncate text-sm">
                    <span className="text-muted-foreground">{owner}/</span>
                    <span className="font-medium">{name}</span>
                  </span>
                  <GithubPrivateBadge isPrivate={repo.private} />
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export function GithubReadableRepos() {
  return (
    <Suspense fallback={<Skeleton className="h-40 w-full" />}>
      <GithubReadableReposView />
    </Suspense>
  );
}
