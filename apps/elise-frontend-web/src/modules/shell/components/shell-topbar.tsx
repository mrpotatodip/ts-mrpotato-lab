import { Fragment, type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { useIsFetching, useQueryClient } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { Button } from "#/components/ui/button";
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "#/components/ui/breadcrumb";
import { Tooltip, TooltipContent, TooltipTrigger } from "#/components/ui/tooltip";
import { cn } from "#/lib/utils";
import { useRouteNames, type RouteNames } from "../hooks";
type Crumb = { label: string; to?: "/scans" | "/repos" | "/connections" | "/summary"; branch?: { repoId: string; branchId: string }; plain?: boolean };

// -----
// A scan belongs to the branch it read, so its breadcrumb follows the data:
// repository, branch (a way back to the branch page), then the scan. A scan of
// a pasted commit has no branch and says so. Without names (the loader has not
// answered) it falls back to the plain trail.
// -----
const scanCrumbs = (names: RouteNames | null): Crumb[] => {
  if (!names) return [{ label: "Scans", to: "/scans" }, { label: "Report" }];
  const repo: Crumb = { label: names.name, plain: true };
  const scan = names.commit ? `Scan ${names.commit}` : "Scan";
  if (names.branch && names.repoId && names.branchId) {
    return [{ label: "Repositories", to: "/repos" }, repo, { label: names.branch, branch: { repoId: names.repoId, branchId: names.branchId } }, { label: scan }];
  }
  return [{ label: "Repositories", to: "/repos" }, repo, { label: names.commit ? `One-off scan ${names.commit}` : "Scan" }];
};

const crumbs = (pathname: string, names: RouteNames | null): Crumb[] => {
  if (pathname.startsWith("/scans/")) return scanCrumbs(names);
  if (pathname.startsWith("/scans")) return [{ label: "Scans" }];
  if (pathname.startsWith("/repos/") && pathname.includes("/branches/")) {
    return [{ label: "Repositories", to: "/repos" }, ...(names ? [{ label: names.name, plain: true }] : []), { label: names?.branch ?? "Branch" }];
  }
  if (pathname.startsWith("/repos/")) return [{ label: "Repositories", to: "/repos" }, { label: names?.name ?? "Repository" }];
  if (pathname.startsWith("/repos")) return [{ label: "Repositories" }];
  if (pathname.startsWith("/files")) return [{ label: "Files" }];
  if (pathname.startsWith("/github/")) return [{ label: "Connections", to: "/connections" }, { label: "Finish connecting GitHub" }];
  if (pathname.startsWith("/connections")) return [{ label: "Connections" }];
  if (pathname.startsWith("/team")) return [{ label: "Team" }];
  if (pathname.startsWith("/settings")) return [{ label: "Settings" }];
  if (pathname.startsWith("/summary/")) return [{ label: "Summary", to: "/summary" }, { label: names?.name ?? "Repository" }];
  if (pathname.startsWith("/summary")) return [{ label: "Summary" }];
  return [{ label: "Overview" }];
};

type ShellTopbarProps = {
  actions?: ReactNode;
};

export function ShellTopbar({ actions }: ShellTopbarProps) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const names = useRouteNames();
  const queryClient = useQueryClient();
  const fetching = useIsFetching() > 0;
  const trail = crumbs(pathname, names);

  return (
    <header className="sticky top-0 z-10 border-b bg-background/75 backdrop-blur-md">
      <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-8">
        <Breadcrumb className="min-w-0">
          <BreadcrumbList className="flex-nowrap">
            {trail.map((crumb, index) => (
              <Fragment key={crumb.label}>
                {index > 0 && <BreadcrumbSeparator />}
                <BreadcrumbItem className="min-w-0">
                  {crumb.to ? (
                    <Link to={crumb.to} className="rounded-sm transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                      {crumb.label}
                    </Link>
                  ) : crumb.branch ? (
                    <Link
                      to="/repos/$repoId/branches/$branchId"
                      params={crumb.branch}
                      title={crumb.label}
                      className="block truncate rounded-sm transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {crumb.label}
                    </Link>
                  ) : crumb.plain ? (
                    <span className="truncate" title={crumb.label}>
                      {crumb.label}
                    </span>
                  ) : (
                    <BreadcrumbPage className="truncate" title={crumb.label}>
                      {crumb.label}
                    </BreadcrumbPage>
                  )}
                </BreadcrumbItem>
              </Fragment>
            ))}
          </BreadcrumbList>
        </Breadcrumb>
        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger render={<Button variant="outline" size="sm" aria-label="Refresh" onClick={() => queryClient.invalidateQueries()} />}>
              <RefreshCw className={cn("size-3.5", fetching && "animate-spin")} />
              <span className="hidden sm:inline">Refresh</span>
            </TooltipTrigger>
            <TooltipContent>Reload scans and findings</TooltipContent>
          </Tooltip>
          {actions}
        </div>
      </div>
    </header>
  );
}
