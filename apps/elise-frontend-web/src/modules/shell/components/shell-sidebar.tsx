import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronUp, FileText, FlaskConical, FolderGit2, LayoutDashboard, PanelLeftClose, PanelLeftOpen, ScanSearch, Sparkles, Users } from "lucide-react";
import { Avatar, AvatarFallback } from "#/components/ui/avatar";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { Collapsible, CollapsiblePanel, CollapsibleTrigger } from "#/components/ui/collapsible";
import { Tooltip, TooltipContent, TooltipTrigger } from "#/components/ui/tooltip";
import { AuthSignOutButton } from "#/modules/auth";
import { cn } from "#/lib/utils";
import { ShellBrand } from "./shell-brand";
import { useSidebarReposOpen } from "../hooks";
import { ShellRepoTree } from "./shell-repo-tree";
import { ShellThemeSwitch } from "./shell-theme-switch";

export type ShellRepo = {
  id: string;
  owner: string;
  name: string;
  status: "queued" | "running" | "succeeded" | "failed";
};

const ROW =
  "relative flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
const ACTIVE = { className: "bg-accent text-foreground" };
const SECTION = "px-3 pb-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground";
const ICON = "size-[18px] shrink-0";
const CHEVRON = "size-4 rotate-180 transition-transform group-data-[panel-open]:rotate-0";
const TOGGLE =
  "group absolute right-2 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

type ShellSidebarProps = {
  accountName: string;
  userName?: string;
  email: string;
  scanCount: number;
  running: number;
  repos: readonly ShellRepo[];
  repoCount: number;
  mode: "live" | "demo";
  showTeam: boolean;
  collapsed: boolean;
  canToggle: boolean;
  onToggle: () => void;
};

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

function Hint({ label, collapsed, children }: { label: string; collapsed: boolean; children: ReactNode }) {
  if (!collapsed) return children;
  return (
    <Tooltip>
      <TooltipTrigger render={<div className="w-full" />}>{children}</TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
}

export function ShellSidebar({ accountName, userName, email, scanCount, running, repos, repoCount, mode, showTeam, collapsed, canToggle, onToggle }: ShellSidebarProps) {
  const { open: reposOpen, setOpen: setReposOpen } = useSidebarReposOpen();
  const scansLabel = running > 0 ? `Scans, ${running} in progress` : "Scans";
  const hasRepoChildren = repoCount >= 2;
  const empty = scanCount === 0;
  const personName = userName || accountName;
  const personDetail = userName ? accountName : email;

  return (
    <aside className={cn("sticky top-0 flex h-svh flex-col gap-6 overflow-y-auto overflow-x-hidden border-r bg-sidebar pb-4 pt-6", collapsed ? "px-2.5" : "px-3")}>
      <div className={cn("flex items-center", collapsed ? "flex-col gap-3" : "justify-between pl-2 pr-1")}>
        <Link to="/overview" aria-label={collapsed ? "Elise overview" : undefined} className="rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          {collapsed ? <span className="text-xl font-semibold tracking-tight">E</span> : <ShellBrand />}
        </Link>
        {canToggle && (
          <Tooltip>
            <TooltipTrigger
              render={<Button variant="ghost" size="icon-sm" aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} aria-expanded={!collapsed} className="text-muted-foreground" onClick={onToggle} />}
            >
              {collapsed ? <PanelLeftOpen strokeWidth={1.5} /> : <PanelLeftClose strokeWidth={1.5} />}
            </TooltipTrigger>
            <TooltipContent side={collapsed ? "right" : "bottom"}>{collapsed ? "Expand" : "Collapse"} sidebar (Ctrl B)</TooltipContent>
          </Tooltip>
        )}
      </div>

      <nav aria-label="Main" className="grid grid-cols-[minmax(0,1fr)] gap-1">
        <Hint label="Overview" collapsed={collapsed}>
          <Link to="/overview" aria-label="Overview" className={cn(ROW, collapsed && "justify-center px-0")} activeProps={ACTIVE}>
            <LayoutDashboard className={ICON} strokeWidth={1.5} />
            {!collapsed && "Overview"}
          </Link>
        </Hint>

        <Hint label={scansLabel} collapsed={collapsed}>
          <Link to="/scans" aria-label={collapsed ? scansLabel : undefined} className={cn(ROW, collapsed && "justify-center px-0")} activeProps={ACTIVE}>
            <ScanSearch className={ICON} strokeWidth={1.5} />
            {collapsed ? (
              running > 0 && <span aria-hidden="true" className="absolute right-2.5 top-2 size-2 animate-pulse rounded-full bg-mark-info" />
            ) : (
              <>
                <span className="flex-1">Scans</span>
                {running > 0 && (
                  <>
                    <span aria-hidden="true" className="size-2 animate-pulse rounded-full bg-mark-info" />
                    <span className="sr-only">{running} in progress</span>
                  </>
                )}
                {scanCount > 0 && (
                  <Badge variant="secondary" className="h-5 min-w-5 justify-center px-1.5 tabular-nums">
                    {scanCount}
                  </Badge>
                )}
              </>
            )}
          </Link>
        </Hint>

        {collapsed || !hasRepoChildren ? (
          <Hint label="Repositories" collapsed={collapsed}>
            <Link to="/repos" aria-label="Repositories" className={cn(ROW, collapsed && "justify-center px-0")} activeProps={ACTIVE}>
              <FolderGit2 className={ICON} strokeWidth={1.5} />
              {!collapsed && "Repositories"}
            </Link>
          </Hint>
        ) : (
          <Collapsible open={reposOpen} onOpenChange={setReposOpen} className="mb-2">
            <div className="relative">
              <Link to="/repos" activeOptions={{ exact: true }} className={cn(ROW, "pr-10")} activeProps={ACTIVE}>
                <FolderGit2 className={ICON} strokeWidth={1.5} />
                Repositories
              </Link>
              <CollapsibleTrigger aria-label={reposOpen ? "Hide recent repositories" : "Show recent repositories"} className={TOGGLE}>
                <ChevronUp className={CHEVRON} strokeWidth={1.5} />
              </CollapsibleTrigger>
            </div>
            <CollapsiblePanel>
              <ShellRepoTree repos={repos} mode={mode} />
            </CollapsiblePanel>
          </Collapsible>
        )}

        <Hint label="Files" collapsed={collapsed}>
          <Link to="/files" aria-label="Files" className={cn(ROW, collapsed && "justify-center px-0")} activeProps={ACTIVE}>
            <FileText className={ICON} strokeWidth={1.5} />
            {!collapsed && "Files"}
          </Link>
        </Hint>

        {showTeam && (
          <Hint label="Team" collapsed={collapsed}>
            <Link to="/team" aria-label="Team" className={cn(ROW, collapsed && "justify-center px-0")} activeProps={ACTIVE}>
              <Users className={ICON} strokeWidth={1.5} />
              {!collapsed && "Team"}
            </Link>
          </Hint>
        )}
      </nav>

      {empty && !collapsed && (
        <Link
          to="/scans"
          className="mx-1 grid gap-1 rounded-xl border border-dashed border-input p-4 text-sm transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="flex items-center gap-2 font-medium">
            <Sparkles className="size-4 text-primary-ink" strokeWidth={1.5} />
            Run your first audit
          </span>
          <span className="text-xs text-muted-foreground">Paste a public GitHub repository to get a report.</span>
        </Link>
      )}

      {import.meta.env.DEV && (
        <nav aria-label="Preview" className="grid grid-cols-[minmax(0,1fr)] gap-1">
          {!collapsed && <p className={SECTION}>Preview</p>}
          <Hint label="Demo screens" collapsed={collapsed}>
            <Link to="/prototype" aria-label="Demo screens" className={cn(ROW, collapsed && "justify-center px-0")} activeProps={ACTIVE}>
              <FlaskConical className={ICON} strokeWidth={1.5} />
              {!collapsed && "Demo screens"}
            </Link>
          </Hint>
        </nav>
      )}

      <div className="mt-auto grid gap-3">
        {collapsed ? (
          <div className="grid justify-items-center gap-2">
            <ShellThemeSwitch collapsed />
            <Tooltip>
              <TooltipTrigger render={<div />}>
                <Avatar className="size-10">
                  <AvatarFallback>{initials(personName)}</AvatarFallback>
                </Avatar>
              </TooltipTrigger>
              <TooltipContent side="right">
                {personName}
                <span className="block text-muted-foreground">{personDetail}</span>
                <span className="block text-muted-foreground">{email}</span>
              </TooltipContent>
            </Tooltip>
            <AuthSignOutButton />
          </div>
        ) : (
          <>
          <ShellThemeSwitch />
          <div className="flex items-center gap-3 rounded-xl bg-card p-2.5 shadow-card" title={email}>
            <Avatar className="size-10">
              <AvatarFallback>{initials(personName)}</AvatarFallback>
            </Avatar>
            <div className="grid min-w-0 flex-1 leading-tight">
              <span className="truncate text-sm font-medium">{personName}</span>
              <span className="truncate text-xs text-muted-foreground">{personDetail}</span>
            </div>
            <AuthSignOutButton />
          </div>
          </>
        )}
      </div>
    </aside>
  );
}
