import { Link, useRouterState } from "@tanstack/react-router";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "#/components/ui/sidebar";
import { useAdminAccess } from "#/modules/admin";
import { LogoutButton } from "#/modules/auth";
import { TenantPicker, useTenants } from "#/modules/tenant";
import { DASHBOARD_ADMIN_GROUP, DASHBOARD_NAV_GROUPS } from "../constants";

type DashboardSidebarProps = {
  userName: string;
};

// -----
// The cafe on top, the screens in the middle (the cafe's,
// then the platform's for a superuser), who is signed in
// at the bottom.
// -----
export function DashboardSidebar({ userName }: DashboardSidebarProps) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const { setOpenMobile } = useSidebar();
  const { isSuperuser } = useAdminAccess();
  const { data: tenants } = useTenants();
  const hasCafe = (tenants?.tenants.length ?? 0) > 0;
  const groups = [...(hasCafe ? DASHBOARD_NAV_GROUPS : []), ...(isSuperuser ? [DASHBOARD_ADMIN_GROUP] : [])];

  return (
    <Sidebar collapsible="offcanvas">
      <SidebarHeader className="gap-3 p-4">
        <span className="text-base font-semibold tracking-tight">Amelie</span>
        <TenantPicker />
      </SidebarHeader>
      <SidebarContent>
        {groups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map(({ to, label, icon: Icon }) => (
                  <SidebarMenuItem key={to}>
                    <SidebarMenuButton
                      className="h-10 gap-3 px-3 text-[0.9375rem] [&>svg]:size-[1.125rem]"
                      isActive={pathname === to || pathname.startsWith(`${to}/`)}
                      render={<Link to={to} onClick={() => setOpenMobile(false)} />}
                    >
                      <Icon />
                      <span>{label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter className="gap-2 p-4">
        <p className="text-muted-foreground truncate text-xs">{userName}</p>
        <LogoutButton />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
