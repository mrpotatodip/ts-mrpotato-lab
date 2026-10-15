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
import { TenantPicker, useTenants } from "#/modules/tenant";
import { DASHBOARD_ADMIN_GROUP, DASHBOARD_MENU_SUBNAV, DASHBOARD_NAV_GROUPS } from "../constants";
import { DashboardAccountMenu } from "./dashboard-account-menu";
import { DashboardFaqNav } from "./dashboard-faq-subnav";
import { DashboardMenuNav } from "./dashboard-menu-subnav";
import { DashboardScopePickers } from "./dashboard-scope-pickers";

type DashboardSidebarProps = {
  userName: string;
  userEmail: string;
};

// -----
// The cafe on top, the screens in the middle (the cafe's,
// then the platform's for a superuser), who is signed in
// at the bottom.
// -----
export function DashboardSidebar({ userName, userEmail }: DashboardSidebarProps) {
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
        <DashboardScopePickers />
      </SidebarHeader>
      <SidebarContent>
        {groups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-0.5">
                {group.items.map(({ to, label, icon: Icon }) => (
                  <SidebarMenuItem key={to}>
                    {to === "/menu" ? (
                      <DashboardMenuNav
                        label={label}
                        icon={Icon}
                        isActive={DASHBOARD_MENU_SUBNAV.some(
                          (item) => pathname === item.to || pathname.startsWith(`${item.to}/`),
                        )}
                      />
                    ) : to === "/faqs" ? (
                      <DashboardFaqNav label={label} icon={Icon} isActive={pathname === to} />
                    ) : (
                      <SidebarMenuButton
                        className="h-8 gap-3 px-3 text-[0.9375rem] [&>svg]:size-[1.125rem]"
                        isActive={pathname === to || pathname.startsWith(`${to}/`)}
                        render={<Link to={to} onClick={() => setOpenMobile(false)} />}
                      >
                        <Icon />
                        <span>{label}</span>
                      </SidebarMenuButton>
                    )}
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter className="bg-sidebar z-10 p-2">
        <DashboardAccountMenu userName={userName} userEmail={userEmail} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
