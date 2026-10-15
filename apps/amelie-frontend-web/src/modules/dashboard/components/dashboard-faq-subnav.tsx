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
import { FAQ_NO_CATEGORY, FaqSearchSchema, faqNavEntries, resolveFaqCategoryKey, useFaqs } from "#/modules/faq";

type DashboardFaqNavProps = {
  label: string;
  icon: LucideIcon;
  isActive: boolean;
};

export function DashboardFaqNav({ label, icon: Icon, isActive }: DashboardFaqNavProps) {
  const { data } = useFaqs();
  const { setOpenMobile } = useSidebar();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const categoryKey = useRouterState({
    select: (state) => {
      const parsed = FaqSearchSchema.safeParse(state.location.search);
      return parsed.success ? parsed.data.category : undefined;
    },
  });

  const selectedKey = pathname === "/faqs" ? resolveFaqCategoryKey(data?.categories ?? [], categoryKey) : null;
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
        {data ? (
          <SidebarMenuSub>
            {faqNavEntries(data.categories).map((entry) => (
              <SidebarMenuSubItem key={entry.key}>
                <SidebarMenuSubButton
                  size="md"
                  isActive={selectedKey === entry.key}
                  className="h-8 text-sm tracking-tight text-sidebar-foreground/70 data-[active=true]:font-medium data-[active=true]:text-sidebar-accent-foreground"
                  render={
                    <Link
                      to="/faqs"
                      search={entry.key === FAQ_NO_CATEGORY ? {} : { category: entry.key }}
                      onClick={() => setOpenMobile(false)}
                    />
                  }
                >
                  <span>{entry.title}</span>
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            ))}
          </SidebarMenuSub>
        ) : null}
      </CollapsibleContent>
    </Collapsible>
  );
}
