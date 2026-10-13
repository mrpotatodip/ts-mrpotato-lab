import { useRouterState } from "@tanstack/react-router";

import { Separator } from "#/components/ui/separator";
import { SidebarTrigger } from "#/components/ui/sidebar";
import { useActiveTenantRole } from "#/modules/tenant";
import { DASHBOARD_NAV_ITEMS } from "../constants";
import { DashboardStatusBadge } from "./dashboard-status-badge";
import { DashboardThemeToggle } from "./dashboard-theme-toggle";

// -----
// Names the screen, and tells a staff member they can
// look but not change anything.
// -----
export function DashboardHeader() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const { role, canEdit } = useActiveTenantRole();
  const current = DASHBOARD_NAV_ITEMS.find((item) => pathname === item.to || pathname.startsWith(`${item.to}/`));

  return (
    <header className="bg-background/80 sticky top-0 z-10 flex h-14 items-center gap-2 border-b px-4 backdrop-blur">
      <SidebarTrigger />
      <Separator orientation="vertical" className="h-5" />
      <span className="text-sm font-medium">{current?.label ?? "Dashboard"}</span>
      <div className="ml-auto flex items-center gap-2">
        {role && !canEdit ? <DashboardStatusBadge tone="neutral">View only</DashboardStatusBadge> : null}
        <DashboardThemeToggle />
      </div>
    </header>
  );
}
