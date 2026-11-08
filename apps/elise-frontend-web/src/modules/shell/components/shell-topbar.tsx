import { Fragment, type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { useIsFetching, useQueryClient } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { Button } from "#/components/ui/button";
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "#/components/ui/breadcrumb";
import { Tooltip, TooltipContent, TooltipTrigger } from "#/components/ui/tooltip";
import { cn } from "#/lib/utils";

type Crumb = { label: string; to?: "/scans" | "/repos" };

const crumbs = (pathname: string): Crumb[] => {
  if (pathname.startsWith("/prototype")) return [{ label: "Demo screens" }];
  if (pathname.startsWith("/scans/")) return [{ label: "Scans", to: "/scans" }, { label: "Report" }];
  if (pathname.startsWith("/scans")) return [{ label: "Scans" }];
  if (pathname.startsWith("/repos/") && pathname.includes("/branches/")) return [{ label: "Repositories", to: "/repos" }, { label: "Branch" }];
  if (pathname.startsWith("/repos/")) return [{ label: "Repositories", to: "/repos" }, { label: "Repository" }];
  if (pathname.startsWith("/repos")) return [{ label: "Repositories" }];
  if (pathname.startsWith("/team")) return [{ label: "Team" }];
  return [{ label: "Overview" }];
};

type ShellTopbarProps = {
  actions?: ReactNode;
};

export function ShellTopbar({ actions }: ShellTopbarProps) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const queryClient = useQueryClient();
  const fetching = useIsFetching() > 0;
  const trail = crumbs(pathname);

  return (
    <header className="sticky top-0 z-10 border-b bg-background/75 backdrop-blur-md">
      <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between px-4 sm:px-8">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>Elise</BreadcrumbItem>
            {trail.map((crumb) => (
              <Fragment key={crumb.label}>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  {crumb.to ? (
                    <Link to={crumb.to} className="rounded-sm transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                      {crumb.label}
                    </Link>
                  ) : (
                    <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
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
