import { Link, useRouterState } from "@tanstack/react-router";

import { SidebarMenuSub, SidebarMenuSubButton, SidebarMenuSubItem, useSidebar } from "#/components/ui/sidebar";
import { FAQ_NO_CATEGORY, FaqSearchSchema, faqNavEntries, resolveFaqCategoryKey, useFaqs } from "#/modules/faq";

export function DashboardFaqSubnav() {
  const { data } = useFaqs();
  const { setOpenMobile } = useSidebar();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const categoryKey = useRouterState({
    select: (state) => {
      const parsed = FaqSearchSchema.safeParse(state.location.search);
      return parsed.success ? parsed.data.category : undefined;
    },
  });

  if (!data) return null;

  const selectedKey = pathname === "/faqs" ? resolveFaqCategoryKey(data.categories, categoryKey) : null;

  return (
    <SidebarMenuSub>
      {faqNavEntries(data.categories).map((entry) => (
        <SidebarMenuSubItem key={entry.key}>
          <SidebarMenuSubButton
            size="sm"
            isActive={selectedKey === entry.key}
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
  );
}
