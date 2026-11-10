import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { GitBranch, LoaderCircle, Lock } from "lucide-react";
import { cn } from "#/lib/utils";
import { useRouteNames, type SidebarBranch } from "../hooks";
import type { ShellRepo } from "./shell-sidebar";

const ITEM =
  "relative min-w-0 pl-[1.35rem] pb-1 before:absolute before:left-0 before:top-0 before:h-[1.125rem] before:w-3 before:rounded-bl-lg before:border-b before:border-l before:border-input";
const ITEM_LINE = "after:absolute after:bottom-0 after:left-0 after:top-0 after:border-l after:border-input";
const LINK =
  "flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
const ACTIVE = { className: "bg-accent text-foreground" };

type ShellRepoTreeProps = {
  repos: readonly ShellRepo[];
};

// -----
// The sidebar shows the latest scan with one small mark: a green dot for
// succeeded, a red dot for failed, and a spinner while a scan is in progress.
// -----
function RepoBody({ repo, showOwner }: { repo: ShellRepo; showOwner: boolean }) {
  const running = repo.status === "running" || repo.status === "queued";
  return (
    <>
      <span className="flex min-w-0 flex-1" title={`${repo.owner}/${repo.name}`}>
        {showOwner && repo.owner && <span className="min-w-0 truncate">{repo.owner}/</span>}
        <span className="max-w-full shrink-0 truncate text-foreground">{repo.name}</span>
      </span>
      {repo.isPrivate && (
        <>
          <Lock aria-hidden="true" className="size-3 shrink-0 text-muted-foreground" strokeWidth={1.5} />
          <span className="sr-only">Private repository</span>
        </>
      )}
      {running && (
        <>
          <LoaderCircle aria-hidden="true" className="size-3.5 shrink-0 animate-spin text-status-info" strokeWidth={1.5} />
          <span className="sr-only">A scan is running</span>
        </>
      )}
      {repo.status === "failed" && (
        <>
          <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-mark-danger" />
          <span className="sr-only">The latest scan failed</span>
        </>
      )}
      {repo.status === "succeeded" && (
        <>
          <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-mark-success" />
          <span className="sr-only">The latest scan succeeded</span>
        </>
      )}
    </>
  );
}

const VISIBLE_BRANCHES = 5;
const BRANCH_ITEM =
  "relative min-w-0 pb-0.5 pl-5 before:absolute before:left-0 before:top-0 before:h-4 before:w-3 before:rounded-bl-lg before:border-b before:border-l before:border-input";
const BRANCH_ITEM_LINE = "after:absolute after:bottom-0 after:left-0 after:top-0 after:border-l after:border-input";
const BRANCH_LINK =
  "flex h-8 items-center gap-2 rounded-md px-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

const visibleBranches = (branches: readonly SidebarBranch[], currentId: string | undefined, expanded: boolean) => {
  if (expanded) return branches;
  const top = branches.slice(0, VISIBLE_BRANCHES);
  const current = branches.find((branch) => branch.id === currentId);
  return current && !top.includes(current) ? [...top.slice(0, VISIBLE_BRANCHES - 1), current] : top;
};

// -----
// Branch names share long prefixes (feature/..., fix/...), and cutting the end
// would make them look the same. The row shows the last part of the name, and
// the whole name when two branches end the same way.
// -----
const branchLabel = (name: string, branches: readonly SidebarBranch[]) => {
  const last = name.split("/").at(-1) ?? name;
  return branches.filter((branch) => (branch.name.split("/").at(-1) ?? branch.name) === last).length > 1 ? name : last;
};

// -----
// The branches of the repository the reader is in, quiet like the rest of the
// tree: the default first, then the latest scanned, five at a time. The branch
// being read is always in the list, whatever its rank.
// -----
function RepoBranches({ repoId, branches, currentId }: { repoId: string; branches: readonly SidebarBranch[]; currentId: string | undefined }) {
  const [expanded, setExpanded] = useState(false);
  const shown = visibleBranches(branches, currentId, expanded);
  const hidden = branches.length - shown.length;

  return (
    <ul aria-label="Branches" className="mb-2 ml-3 mt-1 grid">
      {shown.map((branch, index) => (
        <li key={branch.id} className={cn(BRANCH_ITEM, index < shown.length - 1 && BRANCH_ITEM_LINE)}>
          <Link to="/repos/$repoId/branches/$branchId" params={{ repoId, branchId: branch.id }} className={BRANCH_LINK} activeProps={ACTIVE}>
            <GitBranch aria-hidden="true" className="size-3.5 shrink-0" strokeWidth={1.5} />
            <span className="min-w-0 flex-1 truncate" title={branch.name}>
              {branchLabel(branch.name, branches)}
            </span>
            {(branch.status === "running" || branch.status === "queued") && (
              <>
                <LoaderCircle aria-hidden="true" className="size-3.5 shrink-0 animate-spin text-status-info" strokeWidth={1.5} />
                <span className="sr-only">A scan is running</span>
              </>
            )}
            {branch.status === "failed" && (
              <>
                <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-mark-danger" />
                <span className="sr-only">The latest scan failed</span>
              </>
            )}
            {branch.status === "succeeded" && (
              <>
                <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-mark-success" />
                <span className="sr-only">The latest scan succeeded</span>
              </>
            )}
          </Link>
        </li>
      ))}
      {(hidden > 0 || expanded) && branches.length > VISIBLE_BRANCHES && (
        <li className="min-w-0 pl-5">
          <button type="button" aria-expanded={expanded} onClick={() => setExpanded((open) => !open)} className={cn(BRANCH_LINK, "w-full")}>
            {expanded ? "Show fewer" : `Show ${hidden} more`}
          </button>
        </li>
      )}
    </ul>
  );
}

export function ShellRepoTree({ repos }: ShellRepoTreeProps) {
  const sharedNames = new Set(repos.map((repo) => repo.name).filter((name, index, names) => names.indexOf(name) !== index));
  const names = useRouteNames();

  return (
    <ul aria-label="Recently scanned repositories" className="ml-[1.4rem] mt-0.5 grid grid-cols-[minmax(0,1fr)] pb-1">
      {repos.map((repo, index) => {
        const active = names?.repoId === repo.id && names.branches && names.branches.length > 0 ? names.branches : null;
        return (
          <li key={repo.id} className={cn(ITEM, index < repos.length - 1 && ITEM_LINE)}>
            <Link to="/repos/$repoId" params={{ repoId: repo.id }} className={LINK} activeProps={active ? { className: "text-foreground" } : ACTIVE}>
              <RepoBody repo={repo} showOwner={sharedNames.has(repo.name)} />
            </Link>
            {active && <RepoBranches repoId={repo.id} branches={active} currentId={names?.branchId} />}
          </li>
        );
      })}
      <li className="relative min-w-0 pl-[1.35rem]">
        <Link to="/repos" className={LINK}>
          View all repositories
        </Link>
      </li>
    </ul>
  );
}
