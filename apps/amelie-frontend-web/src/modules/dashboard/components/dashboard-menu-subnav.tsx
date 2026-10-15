import { useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { ChevronRight, type LucideIcon } from "lucide-react";

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "#/components/ui/collapsible";
import {
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "#/components/ui/sidebar";
import { DASHBOARD_MENU_SUBNAV } from "../constants";

type DashboardMenuNavProps = {
  label: string;
  icon: LucideIcon;
  isActive: boolean;
};

export function DashboardMenuNav({ label, icon: Icon, isActive }: DashboardMenuNavProps) {
  const { setOpenMobile } = useSidebar();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const [userOpen, setUserOpen] = useState<boolean | null>(null);
  const open = userOpen ?? isActive;

  return (
    <Collapsible open={open} onOpenChange={setUserOpen} className="group/collapsible w-full">
      <SidebarMenuButton
        className="h-8 gap-3 px-3 text-[0.9375rem] [&>svg]:size-[1.125rem]"
        isActive={isActive}
        render={<CollapsibleTrigger />}
      >
        <Icon />
        <span>{label}</span>
        <ChevronRight className="ml-auto transition-transform group-data-[open]/collapsible:rotate-90" />
      </SidebarMenuButton>
      <CollapsibleContent>
        <SidebarMenuSub>
          {DASHBOARD_MENU_SUBNAV.map(({ to, label: itemLabel, icon: ItemIcon }) => (
            <SidebarMenuSubItem key={to}>
              <SidebarMenuSubButton
                size="md"
                isActive={pathname === to || pathname.startsWith(`${to}/`)}
                className="h-8 text-sm tracking-tight text-sidebar-foreground/70 data-[active=true]:font-medium data-[active=true]:text-sidebar-accent-foreground"
                render={<Link to={to} onClick={() => setOpenMobile(false)} />}
              >
                <ItemIcon />
                <span>{itemLabel}</span>
              </SidebarMenuSubButton>
            </SidebarMenuSubItem>
          ))}
        </SidebarMenuSub>
      </CollapsibleContent>
    </Collapsible>
  );
}
