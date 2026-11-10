import { useCallback, useEffect, useState, type ReactNode } from "react";
import { TooltipProvider } from "#/components/ui/tooltip";
import { useNarrow } from "#/lib/use-hydrated";
import { cn } from "#/lib/utils";
import { useSidebarCollapsed, useSkyRotation } from "../hooks";
import { ShellSidebar, type ShellRepo } from "./shell-sidebar";
import { ShellTopbar } from "./shell-topbar";

type ShellFrameProps = {
  accountName: string;
  userName?: string;
  email: string;
  scanCount: number;
  running: number;
  repos: readonly ShellRepo[];
  repoCount: number;
  showTeam?: boolean;
  actions?: ReactNode;
  children: ReactNode;
};

export function ShellFrame({ accountName, userName, email, scanCount, running, repos, repoCount, showTeam = false, actions, children }: ShellFrameProps) {
  const { collapsed: preferred, toggle: flip } = useSidebarCollapsed();
  const [animate, setAnimate] = useState(false);
  const narrow = useNarrow();
  useSkyRotation();
  const collapsed = preferred || narrow;

  const toggle = useCallback(() => {
    setAnimate(true);
    flip();
  }, [flip]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "b") {
        event.preventDefault();
        toggle();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggle]);

  return (
    <TooltipProvider>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-foreground focus:shadow-raised">
        Skip to content
      </a>
      <div className={cn("grid min-h-svh", animate && "transition-[grid-template-columns] duration-200 ease-out", collapsed ? "grid-cols-[4.75rem_minmax(0,1fr)]" : "grid-cols-[16.5rem_minmax(0,1fr)]")}>
        <ShellSidebar accountName={accountName} userName={userName} email={email} scanCount={scanCount} running={running} repos={repos} repoCount={repoCount} showTeam={showTeam} collapsed={collapsed} canToggle={!narrow} onToggle={toggle} />
        <div className="min-w-0">
          <ShellTopbar actions={actions} />
          <main id="main" tabIndex={-1} className="mx-auto focus-visible:outline-none grid w-full max-w-7xl gap-6 px-4 py-6 sm:px-8 sm:py-8 lg:gap-8">{children}</main>
        </div>
      </div>
    </TooltipProvider>
  );
}
