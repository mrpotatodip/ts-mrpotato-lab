import { Link } from "@tanstack/react-router";
import { LoaderCircle } from "lucide-react";
import type { ShellRepo } from "./shell-sidebar";

const ITEM =
  "relative min-w-0 pl-[1.35rem] pb-0.5 before:absolute before:left-0 before:top-0 before:h-[1.125rem] before:w-3 before:rounded-bl-lg before:border-b before:border-l before:border-input after:absolute after:bottom-0 after:left-0 after:top-[1.125rem] after:border-l after:border-input last:after:hidden";
const LINK =
  "flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
const ACTIVE = { className: "bg-accent text-foreground" };

type ShellRepoTreeProps = {
  repos: readonly ShellRepo[];
  mode: "live" | "demo";
};

// -----
// The sidebar stays quiet when things are fine: a repository whose latest
// scan succeeded has no marker. Only a scan in progress (a spinner) or a
// failed latest scan (one small red dot) draws the eye.
// -----
function RepoBody({ repo }: { repo: ShellRepo }) {
  const running = repo.status === "running" || repo.status === "queued";
  return (
    <>
      <span className="flex min-w-0 flex-1" title={`${repo.owner}/${repo.name}`}>
        {repo.owner && <span className="min-w-0 truncate">{repo.owner}/</span>}
        <span className="max-w-full shrink-0 truncate text-foreground">{repo.name}</span>
      </span>
      {running && (
        <>
          <LoaderCircle aria-hidden="true" className="size-3.5 shrink-0 animate-spin text-status-info" strokeWidth={1.5} />
          <span className="sr-only">A scan is running</span>
        </>
      )}
      {repo.status === "failed" && (
        <>
          <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-status-danger" />
          <span className="sr-only">The latest scan failed</span>
        </>
      )}
    </>
  );
}

export function ShellRepoTree({ repos, mode }: ShellRepoTreeProps) {
  return (
    <ul aria-label="Recently scanned repositories" className="ml-[1.4rem] mt-0.5 grid grid-cols-[minmax(0,1fr)] pb-1">
      {repos.map((repo) => (
        <li key={repo.id} className={ITEM}>
          {mode === "demo" ? (
            <Link to="/prototype/scans" className={LINK}>
              <RepoBody repo={repo} />
            </Link>
          ) : (
            <Link to="/repos/$repoId" params={{ repoId: repo.id }} className={LINK} activeProps={ACTIVE}>
              <RepoBody repo={repo} />
            </Link>
          )}
        </li>
      ))}
      <li className="relative min-w-0 pl-[1.35rem]">
        {mode === "demo" ? (
          <Link to="/prototype/scans" className={LINK}>
            View all
          </Link>
        ) : (
          <Link to="/repos" activeOptions={{ exact: true }} className={LINK} activeProps={ACTIVE}>
            View all repositories
          </Link>
        )}
      </li>
    </ul>
  );
}
