import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { Badge } from "#/components/ui/badge";
import { Collapsible, CollapsiblePanel, CollapsibleTrigger } from "#/components/ui/collapsible";
import { cn } from "#/lib/utils";
import { repoName, type Repo } from "#/modules/repo";
import { ScanSeverityDots } from "#/modules/scan";
import { REPO_STATUS_BADGE, repoStatus } from "../utils";
import { SummaryFindings } from "./summary-findings";

const ROW = "flex min-h-14 w-full items-center justify-between gap-4 px-5 py-3 text-left text-sm";

function RepoLine({ repo, leading }: { repo: Repo; leading: ReactNode }) {
  const status = REPO_STATUS_BADGE[repoStatus(repo)];

  return (
    <>
      <span className="flex min-w-0 items-center gap-3">
        {leading}
        <span className="grid min-w-0 gap-0.5">
          <span className="truncate font-medium">{repoName(repo.url)}</span>
          <span className="truncate text-xs text-muted-foreground">{repo.defaultBranch ?? "No default branch scanned yet"}</span>
        </span>
      </span>
      <span className="flex shrink-0 flex-wrap items-center justify-end gap-3">
        {repo.open.regressed > 0 && <Badge variant="destructive">{repo.open.regressed} came back</Badge>}
        {repo.open.total > 0 && <ScanSeverityDots counts={repo.open.severity} />}
        {repo.open.total > 0 && <span className="font-medium tabular-nums">{repo.open.total} open</span>}
        <Badge variant={status.variant}>{status.label}</Badge>
      </span>
    </>
  );
}

export function SummaryRepo({ repo, defaultOpen }: { repo: Repo; defaultOpen: boolean }) {
  if (repoStatus(repo) !== "attention")
    return (
      <div className={ROW}>
        <RepoLine repo={repo} leading={<span aria-hidden="true" className="size-4 shrink-0" />} />
      </div>
    );

  return (
    <Collapsible defaultOpen={defaultOpen}>
      <CollapsibleTrigger className={cn(ROW, "group transition-colors hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring")}>
        <RepoLine repo={repo} leading={<ChevronDown aria-hidden="true" className="size-4 shrink-0 -rotate-90 text-muted-foreground transition-transform group-data-[panel-open]:rotate-0" />} />
      </CollapsibleTrigger>
      <CollapsiblePanel>
        <SummaryFindings repo={repo} />
      </CollapsiblePanel>
    </Collapsible>
  );
}
