import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { Badge } from "#/components/ui/badge";
import { cn } from "#/lib/utils";
import { repoName, type Repo } from "#/modules/repo";
import { ScanSeverityDots } from "#/modules/scan";
import { needsPersonLabel, REPO_STATUS_BADGE, repoStatus, repoSubtitle } from "../utils";

const ROW = "flex min-h-14 w-full items-center justify-between gap-4 px-5 py-3 text-left text-sm";

function RepoLine({ repo, leading }: { repo: Repo; leading: ReactNode }) {
  const status = REPO_STATUS_BADGE[repoStatus(repo)];

  return (
    <>
      <span className="flex min-w-0 items-center gap-3">
        {leading}
        <span className="grid min-w-0 gap-0.5">
          <span className="truncate font-medium">{repoName(repo.url)}</span>
          <span className="text-xs leading-relaxed text-muted-foreground">{repoSubtitle(repo)}</span>
        </span>
      </span>
      <span className="flex shrink-0 flex-wrap items-center justify-end gap-3">
        {repo.open.regressed > 0 && <Badge variant="destructive">{repo.open.regressed} came back</Badge>}
        {repo.open.total > 0 && <ScanSeverityDots counts={repo.open.severity} />}
        {repo.open.needsValidation > 0 && <span className="text-xs text-muted-foreground">{needsPersonLabel(repo.open.needsValidation)}</span>}
        {repo.open.total > 0 && <span className="font-medium tabular-nums">{repo.open.total} open</span>}
        <Badge variant={status.variant}>{status.label}</Badge>
      </span>
    </>
  );
}

// -----
// A repository with something open links to its own page; one with
// nothing to read is only a row.
// -----
export function SummaryRepo({ repo }: { repo: Repo }) {
  if (repoStatus(repo) !== "attention")
    return (
      <div className={ROW}>
        <RepoLine repo={repo} leading={<span aria-hidden="true" className="size-4 shrink-0" />} />
      </div>
    );

  return (
    <Link
      to="/summary/$repoId"
      params={{ repoId: repo.id }}
      className={cn(ROW, "group transition-colors hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring")}
    >
      <RepoLine repo={repo} leading={<ChevronRight aria-hidden="true" className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />} />
    </Link>
  );
}
