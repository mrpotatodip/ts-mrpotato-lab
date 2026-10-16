import { ChevronsUpDown, LogOut } from "lucide-react";

import { Avatar, AvatarFallback } from "#/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "#/components/ui/sidebar";
import { useAdminAccess } from "#/modules/admin";
import { useAuthActions } from "#/modules/auth";
import { useActiveTenantRole } from "#/modules/tenant";
import {
  DASHBOARD_PLAN_NAME,
  dashboardAccountInitials,
  dashboardAccountSubtitle,
} from "../utils";

type DashboardAccountMenuProps = {
  userName: string;
  userEmail: string;
};

// -----
// Who is signed in, their role in this cafe, the
// plan the cafe is on, and Log out. Opens up from
// the sidebar foot so the page stays put.
// -----
export function DashboardAccountMenu({ userName, userEmail }: DashboardAccountMenuProps) {
  const { logout } = useAuthActions();
  const { isSuperuser } = useAdminAccess();
  const { roleLabel } = useActiveTenantRole();
  const subtitle = dashboardAccountSubtitle({ roleLabel, isSuperuser });
  const initials = dashboardAccountInitials(userName);
  const displayName = userName.trim() || userEmail || "Account";

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton
                size="lg"
                className="data-popup-open:bg-sidebar-accent data-popup-open:text-sidebar-accent-foreground"
                aria-label="Account"
              />
            }
          >
            <Avatar className="size-8">
              <AvatarFallback className="bg-sidebar-accent text-sidebar-accent-foreground text-xs font-medium">
                {initials}
              </AvatarFallback>
            </Avatar>
            <span className="grid min-w-0 flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">{displayName}</span>
              <span className="text-muted-foreground truncate text-xs">{subtitle}</span>
            </span>
            <ChevronsUpDown className="ml-auto" />
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" sideOffset={8} className="min-w-56">
            <DropdownMenuGroup>
              <DropdownMenuLabel className="font-normal">
                <span className="flex flex-col">
                  <span className="truncate font-medium">{displayName}</span>
                  {userEmail ? <span className="text-muted-foreground truncate text-xs">{userEmail}</span> : null}
                </span>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuLabel className="font-normal">
                <dl className="flex flex-col gap-1.5 text-xs">
                  {roleLabel ? (
                    <div className="flex items-baseline justify-between gap-4">
                      <dt className="text-muted-foreground">Role</dt>
                      <dd>{roleLabel}</dd>
                    </div>
                  ) : null}
                  <div className="flex items-baseline justify-between gap-4">
                    <dt className="text-muted-foreground">Plan</dt>
                    <dd>{DASHBOARD_PLAN_NAME}</dd>
                  </div>
                </dl>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem disabled={logout.isPending} onClick={() => logout.mutate()}>
                <LogOut />
                {logout.isPending ? "Signing out..." : "Log out"}
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
