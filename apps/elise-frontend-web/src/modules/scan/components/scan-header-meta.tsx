import { Link } from "@tanstack/react-router";
import { ChevronRight, ExternalLink, FolderGit2, GitBranch } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "#/components/ui/tooltip";
import { useScanLinkMode } from "../hooks";
import type { ScanStatus } from "../schemas";
import { scanDuration } from "../utils";
import { ScanStatusBadge } from "./scan-status-badge";
import { ScanTime } from "./scan-time";

const CHIP = "inline-flex min-h-9 max-w-full items-center gap-1.5 rounded-md border bg-card px-3 text-sm";
const CHIP_LINK = `${CHIP} transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`;
const ICON_LINK =
  "inline-flex size-9 shrink-0 items-center justify-center rounded-md border bg-card text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
const TEXT_LINK =
  "inline-flex min-h-6 items-center gap-1 rounded-sm text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

const githubUrl = (repo: string) => repo.replace(/\.git$/, "").replace(/\/$/, "");

// -----
// Which branch the scan read, laid out as on the branch page: a chip, and
// beside it a way to open that branch on GitHub. For a scan with a tracked
// branch the chip is the way to that branch's history. A scan of a pasted
// commit has no branch: it is a one-off scan, so it says so and links to the
// repository's history instead.
// -----
function ScanBranchRow({ scan }: { scan: ScanStatus }) {
  const live = useScanLinkMode() === "live";
  const label = scan.branch ?? scan.ref;

  if (!label && !scan.commitSha) return null;

  if (!label) {
    return (
      <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2">
        <span className={CHIP} title="A one-off scan of this commit. Its findings count toward the commit's answer but are not added to a branch's findings.">
          <GitBranch aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
          One-off scan
        </span>
        {live && (
          <Link to="/repos/$repoId" params={{ repoId: scan.repoId }} className={TEXT_LINK}>
            <FolderGit2 aria-hidden="true" className="size-3.5" />
            Repository history
          </Link>
        )}
      </div>
    );
  }

  const chip = (
    <>
      <GitBranch aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
      <span className="truncate font-mono" title={label}>
        {label}
      </span>
    </>
  );

  return (
    <div className="flex min-w-0 items-center gap-2">
      {live && scan.branchId ? (
        <Link to="/repos/$repoId/branches/$branchId" params={{ repoId: scan.repoId, branchId: scan.branchId }} className={CHIP_LINK} title="Open this branch's history">
          {chip}
          <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
          <span className="sr-only">, open this branch's history</span>
        </Link>
      ) : (
        <span className={CHIP}>{chip}</span>
      )}
      <Tooltip>
        <TooltipTrigger render={<a href={`${githubUrl(scan.repo)}/tree/${encodeURI(label)}`} target="_blank" rel="noreferrer" aria-label="Open this branch on GitHub" className={ICON_LINK} />}>
          <ExternalLink aria-hidden="true" className="size-4" />
        </TooltipTrigger>
        <TooltipContent>Open this branch on GitHub</TooltipContent>
      </Tooltip>
    </div>
  );
}

// -----
// What the run was, in one line, so the page opens as calm as the branch
// page: the status, when it started, how long it took, and the commit it read.
// Kind of review, model and effort are in Run details, lower down.
// -----
function ScanStatusLine({ scan }: { scan: ScanStatus }) {
  const duration = scanDuration(scan.usage?.durationMs);
  const commit = scan.commitSha?.slice(0, 7);

  return (
    <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
      <ScanStatusBadge status={scan.status} />
      <span>
        Started <ScanTime value={scan.createdAt} />
      </span>
      <span aria-hidden="true">·</span>
      <span>
        {scan.finishedAt ? "Took" : "Running for"} {duration ?? (scan.finishedAt ? "an unknown time" : "a moment")}
      </span>
      <span aria-hidden="true">·</span>
      {commit ? (
        <a href={`${githubUrl(scan.repo)}/commit/${scan.commitSha}`} target="_blank" rel="noreferrer" className="inline-flex min-h-6 items-center gap-1 font-mono text-[13px] underline-offset-4 hover:underline">
          Read commit {commit}
          <ExternalLink aria-hidden="true" className="size-3" />
          <span className="sr-only">, opens the commit on GitHub</span>
        </a>
      ) : (
        <span>{scan.ref ? `Reading ${scan.ref}` : "Reading the default branch"}</span>
      )}
    </p>
  );
}

export function ScanHeaderMeta({ scan }: { scan: ScanStatus }) {
  return (
    <div className="grid gap-3">
      <ScanBranchRow scan={scan} />
      <ScanStatusLine scan={scan} />
    </div>
  );
}
