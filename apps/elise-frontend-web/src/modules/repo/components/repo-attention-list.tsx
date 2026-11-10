import { Link } from "@tanstack/react-router";
import { ArrowUpRight, ChevronRight, CircleCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "#/components/ui/card";
import { ScanSeverityDots, scanPlural } from "#/modules/scan";
import type { Repo } from "../schemas";
import { rankRepos, repoName } from "../utils";
import { RepoAddDialog } from "./repo-add-dialog";

const SHOWN = 5;

// -----
// The first thing a person wants from the overview is where to act, so this is
// the answer before the history: every repository, the most urgent first, each
// with the one reason it is where it is. A repository with nothing open stays in
// the list, quietly, so a clean result is stated and not just left out. Open
// counts are the default branch's, as on the repository list.
// -----
const reasonFor = ({ open, defaultBranch }: Pick<Repo, "open" | "defaultBranch">) => {
  if (defaultBranch === null) return "No default branch scanned yet";
  if (open.total === 0) return "Nothing is open";
  if (open.regressed > 0) return `${scanPlural(open.regressed, "finding came", "findings came")} back. Look at these first`;
  if (open.needsValidation > 0) return `${scanPlural(open.needsValidation, "finding needs", "findings need")} a person to check`;
  if (open.unchecked > 0) return `${scanPlural(open.unchecked, "finding was", "findings were")} not re-checked`;
  return "Verified and waiting for a decision";
};

const ROW = "flex min-h-12 items-center justify-between gap-4 rounded-lg px-2 py-2.5 text-sm transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
const ALL_LINK = "inline-flex min-h-6 shrink-0 items-center gap-1 rounded-sm text-xs font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function RowBody({ repo }: { repo: Repo }) {
  return (
    <>
      <span className="grid min-w-0 gap-0.5">
        <span className="truncate font-medium">{repoName(repo.url)}</span>
        <span className="truncate text-xs text-muted-foreground">
          {repo.defaultBranch ? `${repo.defaultBranch} · ` : ""}
          {reasonFor(repo)}
        </span>
      </span>
      <span className="flex shrink-0 items-center gap-3">
        {repo.defaultBranch === null ? (
          <span className="text-muted-foreground">Not scanned</span>
        ) : repo.open.total === 0 ? (
          <span className="inline-flex items-center gap-1.5 text-status-success">
            <CircleCheck aria-hidden="true" className="size-4" />
            Clear
          </span>
        ) : (
          <>
            <ScanSeverityDots counts={repo.open.severity} />
            <span className="font-medium tabular-nums">{repo.open.total} open</span>
          </>
        )}
        <ChevronRight aria-hidden="true" className="size-4 text-muted-foreground" />
      </span>
    </>
  );
}

export function RepoAttentionList({ repos }: { repos: readonly Repo[] }) {
  const ranked = rankRepos(repos);
  const shown = ranked.slice(0, SHOWN);
  const more = ranked.length - shown.length;

  return (
    <Card className="flex flex-col">
      <CardHeader className="flex-row items-start justify-between gap-3">
        <div className="grid gap-1.5">
          <CardTitle>Where to look first</CardTitle>
          <p className="max-w-copy text-sm leading-relaxed text-muted-foreground">Every repository, the most urgent first.</p>
        </div>
        <Link to="/repos" className={ALL_LINK}>
          All repositories
          <ArrowUpRight aria-hidden="true" className="size-3.5" />
        </Link>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-3">
        {shown.length === 0 ? (
          <p className="text-sm text-muted-foreground">No repositories yet. One appears here after its first scan.</p>
        ) : (
          <ul className="-mx-2 grid">
            {shown.map((repo) => (
              <li key={repo.id}>
                <Link to="/repos/$repoId" params={{ repoId: repo.id }} className={ROW}>
                  <RowBody repo={repo} />
                </Link>
              </li>
            ))}
          </ul>
        )}
        {more > 0 && <p className="text-sm text-muted-foreground">{scanPlural(more, "more repository", "more repositories")}, ranked lower.</p>}
        {more === 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-5">
            <p className="max-w-copy text-sm leading-relaxed text-muted-foreground">Track another repository to see it here.</p>
            <RepoAddDialog />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
