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
  SidebarSeparator,
  useSidebar,
} from "#/components/ui/sidebar";
import { useAdminAccess } from "#/modules/admin";
import { TenantPicker, useTenants } from "#/modules/tenant";
import { DASHBOARD_ADMIN_GROUP, DASHBOARD_MENU_SUBNAV, DASHBOARD_NAV_GROUPS, isDashboardNavItem } from "../constants";
import { DashboardAccountMenu } from "./dashboard-account-menu";
import { DashboardFaqNav } from "./dashboard-faq-subnav";
import { DashboardMenuNav } from "./dashboard-menu-subnav";
import { DashboardScopePickers } from "./dashboard-scope-pickers";

type DashboardSidebarProps = {
  userName: string;
  userEmail: string;
};

// -----
// The Tenant on top, the screens in the middle (Company
// with chats under it, Store, then the platform's for a
// superuser), who is signed in at the bottom.
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
                {group.items.map((entry, index) => {
                  if (!isDashboardNavItem(entry)) {
                    return (
                      <SidebarMenuItem key={`separator-${index}`} aria-hidden>
                        <SidebarSeparator className="mx-0 my-1.5" />
                      </SidebarMenuItem>
                    );
                  }

                  const Icon = entry.icon;

                  return (
                    <SidebarMenuItem key={entry.to}>
                      {entry.to === "/menu" ? (
                        <DashboardMenuNav
                          label={entry.label}
                          icon={Icon}
                          isActive={DASHBOARD_MENU_SUBNAV.some(
                            (item) => pathname === item.to || pathname.startsWith(`${item.to}/`),
                          )}
                        />
                      ) : entry.to === "/faqs" ? (
                        <DashboardFaqNav label={entry.label} icon={Icon} isActive={pathname === entry.to} />
                      ) : (
                        <SidebarMenuButton
                          className="h-8 gap-3 px-3 text-[0.9375rem] [&>svg]:size-[1.125rem]"
                          isActive={pathname === entry.to || pathname.startsWith(`${entry.to}/`)}
                          render={<Link to={entry.to} onClick={() => setOpenMobile(false)} />}
                        >
                          <Icon />
                          <span>{entry.label}</span>
                        </SidebarMenuButton>
                      )}
                    </SidebarMenuItem>
                  );
                })}
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
